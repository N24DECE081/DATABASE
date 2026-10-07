"""appointments: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("appointments", __name__, url_prefix="/appointments")

from flask import g, flash, redirect, render_template, request, url_for
from ...forms.appointments import BookingForm, StatusForm
from ...repositories import appointments, schedules, patients
from ...security import require_roles
from ...services import appointments as service
from ...services.doctors import own_doctor
from ...utils.forms import data_for
from ...utils.filters import filter_day


@bp.get("/")
@require_roles()
def index():
    return render_template("appointments/index.html", appointments=appointments.list_for(g.user, request.args.get("status", "")[:15], filter_day()))


@bp.route("/new", methods=["GET", "POST"])
@require_roles()
def create():
    form = BookingForm()
    doctor_id = own_doctor(g.user).doctor_id if g.user.role == "DOCTOR" else request.args.get("doctor", "")[:20]
    shifts = schedules.list_schedules(doctor_id, available_only=True)
    form.schedule_id.choices = [(s["schedule_id"], f"{s['doctor_name']} · {s['schedule_date']} {s['start_time']}–{s['end_time']}") for s in shifts]
    if g.user.role == "PATIENT":
        profile = patients.for_user(g.user.user_id)
        form.patient_id.choices = [(profile.patient_id, profile.full_name)] if profile else []
    else:
        form.patient_id.choices = [(p["patient_id"], p["full_name"]) for p in patients.list_patients()]
    if g.user.role == "DOCTOR":
        prior = appointments.list_for(g.user)
        form.follow_up_from_appt_id.choices += [(a["appointment_id"], f"{a['patient_name']} · {a['appointment_date_time']}")
                                               for a in prior if a["status"] not in ("Cancelled", "No-show")]
    if request.method == "GET":
        form.schedule_id.data = request.args.get("schedule", form.schedule_id.choices[0][0] if form.schedule_id.choices else "")
        value = request.args.get("time")
        if value:
            from datetime import datetime
            try:
                form.appointment_date_time.data = datetime.fromisoformat(value)
            except ValueError:
                pass
        form.follow_up_from_appt_id.data = request.args.get("follow_up", "")
    if form.validate_on_submit():
        appointment = service.book(g.user, data_for(form, "schedule_id patient_id appointment_date_time estimated_duration_minutes appointment_type follow_up_from_appt_id reason"))
        flash("Đã đặt lịch hẹn. Bạn có thể xem chi tiết ngay bên dưới.", "success")
        return redirect(url_for("appointments.detail", appointment_id=appointment.appointment_id))
    return render_template("shared/form.html", title="Đặt lịch khám" if g.user.role != "DOCTOR" else "Tạo lịch tái khám",
                           subtitle="Chọn bác sĩ qua ca làm và nhập thời gian mong muốn trong ca đó.", form=form)


@bp.get("/<appointment_id>")
@require_roles()
def detail(appointment_id):
    service.accessible(g.user, appointment_id)
    return render_template("appointments/detail.html", appointment=appointments.details(appointment_id), form=StatusForm())


@bp.post("/<appointment_id>/status")
@require_roles()
def status(appointment_id):
    form = StatusForm()
    if form.validate_on_submit():
        service.change_status(g.user, appointment_id, form.status.data)
        flash("Đã cập nhật trạng thái lịch hẹn.", "success")
    return redirect(url_for("appointments.detail", appointment_id=appointment_id))


@bp.route("/<appointment_id>/reschedule",methods=["GET","POST"])
@require_roles("ADMIN")
def reschedule(appointment_id):
    from ...forms.appointments import RescheduleForm
    appointment=service.accessible(g.user,appointment_id)
    form=RescheduleForm(obj=appointment)
    form.schedule_id.choices=[(s["schedule_id"],f"{s['schedule_date']} {s['start_time']}–{s['end_time']}")
        for s in schedules.list_schedules(appointment.doctor_id,available_only=True)]
    if form.validate_on_submit():
        service.reschedule(g.user,appointment_id,data_for(form,"schedule_id appointment_date_time estimated_duration_minutes appointment_type reason"))
        flash("Đã điều chỉnh lịch hẹn.","success")
        return redirect(url_for("appointments.detail",appointment_id=appointment_id))
    return render_template("shared/form.html",title="Điều chỉnh lịch hẹn",subtitle="Chọn ca làm và thời gian mới của bác sĩ đã phân công.",form=form)
