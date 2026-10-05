from ..common import *


class SessionForm(FlaskForm):
    start_time = DateTimeLocalField("Bắt đầu thực tế", format="%Y-%m-%dT%H:%M", validators=[InputRequired()])
    end_time = DateTimeLocalField("Kết thúc (để trống nếu đang khám)", format="%Y-%m-%dT%H:%M", validators=[Optional()])
    actual_duration_minutes = IntegerField("Thời lượng đã ghi nhận khi chưa kết thúc", validators=[InputRequired(), NumberRange(min=5,max=120)], default=5)
    meeting_url = StringField("Liên kết khám từ xa", validators=[Optional(), Length(max=255), https_url])
    diagnosis_notes = TextAreaField("Ghi chú phiên khám", validators=max_text(8000))
    submit = SubmitField("Lưu phiên khám")


class FinishForm(FlaskForm):
    end_time = DateTimeLocalField("Giờ kết thúc", format="%Y-%m-%dT%H:%M", validators=[InputRequired()])
    submit = SubmitField("Hoàn tất phiên khám")
