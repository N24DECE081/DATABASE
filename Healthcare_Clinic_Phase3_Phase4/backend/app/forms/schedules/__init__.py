from ..common import *


class ScheduleForm(FlaskForm):
    doctor_id = SelectField("Bác sĩ", validators=[InputRequired()])
    schedule_date = DateField("Ngày làm việc", validators=[InputRequired()])
    start_time = TimeField("Bắt đầu", validators=[InputRequired()])
    end_time = TimeField("Kết thúc", validators=[InputRequired()])
    availability_status = SelectField("Trạng thái", choices=[("Available","Khả dụng"),("Busy","Bận"),("On Leave","Nghỉ")])
    submit = SubmitField("Tạo ca làm")


class AvailabilityForm(FlaskForm):
    availability_status = SelectField("Trạng thái", choices=[("Available","Khả dụng"),("Busy","Bận"),("On Leave","Nghỉ")])
    submit = SubmitField("Cập nhật")
