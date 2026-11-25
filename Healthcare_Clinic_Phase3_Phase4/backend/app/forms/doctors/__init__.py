from ..common import *


class DoctorForm(FlaskForm):
    full_name = StringField("Họ tên", validators=[InputRequired(), Length(max=100)])
    phone = StringField("Điện thoại", validators=[InputRequired(), Length(max=15)])
    email = StringField("Email", validators=[InputRequired(), Length(max=100)])
    license_number = StringField("Giấy phép bác sĩ", validators=[InputRequired(), Length(max=50)])
    submit = SubmitField("Lưu thông tin bác sĩ")

    def validate_full_name(self, field):
        if field.data:
            from ...utils.validators import validate_person_name
            try:
                field.data = validate_person_name(field.data, "Họ tên bác sĩ", normalize_case=False)
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_email(self, field):
        if field.data:
            from ...utils.validators import validate_email
            try:
                field.data = validate_email(field.data, "Email", required=True)
            except Exception as exc:
                raise ValidationError(str(exc))
