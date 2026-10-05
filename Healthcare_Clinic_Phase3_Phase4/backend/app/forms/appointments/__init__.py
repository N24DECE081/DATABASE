from ..common import *


class BookingForm(FlaskForm):
    schedule_id = SelectField("Ca làm", validators=[InputRequired()])
    patient_id = SelectField("Bệnh nhân", validators=[Optional()])
    appointment_date_time = DateTimeLocalField("Thời gian mong muốn", format="%Y-%m-%dT%H:%M", validators=[InputRequired()])
    estimated_duration_minutes = SelectField("Thời lượng", coerce=int, choices=[(15,"15 phút"),(30,"30 phút"),(45,"45 phút"),(60,"60 phút")], default=30)
    appointment_type = SelectField("Hình thức", choices=[("In-person","Tại phòng khám"),("Telemedicine","Khám từ xa")])
    follow_up_from_appt_id = SelectField("Lịch hẹn trước (tái khám)", choices=[("","Không tái khám")], validators=[Optional()])
    reason = TextAreaField("Lý do khám", validators=max_text(4000))
    submit = SubmitField("Đặt lịch hẹn")


class StatusForm(FlaskForm):
    status = SelectField("Trạng thái", choices=[("Checked-In","Check-in"),("Cancelled","Hủy lịch"),("No-show","Vắng mặt")])
    submit = SubmitField("Cập nhật")


class RescheduleForm(FlaskForm):
    schedule_id = SelectField("Ca làm của bác sĩ", validators=[InputRequired()])
    appointment_date_time = DateTimeLocalField("Thời gian mới", format="%Y-%m-%dT%H:%M", validators=[InputRequired()])
    estimated_duration_minutes = SelectField("Thời lượng", coerce=int, choices=[(x,f"{x} phút") for x in (15,30,45,60)])
    appointment_type = SelectField("Hình thức", choices=[("In-person","Tại phòng khám"),("Telemedicine","Khám từ xa")])
    reason = TextAreaField("Lý do khám", validators=max_text(4000))
    submit = SubmitField("Lưu lịch hẹn mới")
