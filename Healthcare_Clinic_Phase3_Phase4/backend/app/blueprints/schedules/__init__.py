"""schedules: HTTP routes with role and ownership checks."""

from flask import Blueprint

bp = Blueprint("schedules", __name__, url_prefix="/schedules")

from flask import g, flash, redirect, render_template, request, url_for
from ...entities import DoctorSchedule
from ...forms.schedules import ScheduleForm, AvailabilityForm
from ...repositories import schedules, doctors
from ...security import require_roles
from ...services import schedules as service
from ...services.doctors import own_doctor
from ...services.common import found
from ...utils.forms import data_for, run_form_action
from ...utils.filters import filter_day


@bp.get("/")
@require_roles()
def index():
    doctor_id = request.args.get("doctor", "")[:20]
    if g.user.role == "DOCTOR":
        doctor_id = own_doctor(g.user).doctor_id
    shifts = schedules.list_schedules(doctor_id, filter_day(), available_only=g.user.role == "PATIENT")
    choices = []
    if g.user.role == "PATIENT":
        for row in shifts:
            shift = schedules.get(DoctorSchedule, row["schedule_id"])
            row["starts"] = service.available_starts(shift, 30)
    return render_template("schedules/index.html", schedules=shifts, form=AvailabilityForm())


@bp.route("/new", methods=["GET", "POST"])
@require_roles("ADMIN", "DOCTOR")
def create():
    form = ScheduleForm()
    directory = doctors.directory()
    if g.user.role == "DOCTOR":
        directory = [d for d in directory if d["doctor_id"] == own_doctor(g.user).doctor_id]
    form.doctor_id.choices = [(d["doctor_id"], d["full_name"]) for d in directory]
    if form.validate_on_submit():
        ok, _ = run_form_action(form, lambda: service.create(g.user, data_for(form, "doctor_id schedule_date start_time end_time availability_status")))
        if ok:
            flash("Đã tạo ca làm việc.", "success")
            return redirect(url_for("schedules.index"))
    return render_template("shared/form.html", title="Tạo ca làm việc", subtitle="Ca làm phải có giờ kết thúc sau giờ bắt đầu và không chồng nhau.", form=form)


@bp.post("/<schedule_id>/availability")
@require_roles("ADMIN", "DOCTOR")
def availability(schedule_id):
    form = AvailabilityForm()
    if form.validate_on_submit():
        service.change_availability(g.user, schedule_id, form.availability_status.data)
        flash("Đã cập nhật trạng thái ca làm.", "success")
    return redirect(url_for("schedules.index"))
