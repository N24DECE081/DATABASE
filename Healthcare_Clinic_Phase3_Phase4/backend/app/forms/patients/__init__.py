from ..common import *


class ProfileForm(FlaskForm):
    full_name = StringField("Họ tên", validators=[InputRequired(), Length(max=100)])
    date_of_birth = DateField("Ngày sinh", validators=[InputRequired()])
    gender = SelectField("Giới tính", choices=[("Male","Nam"),("Female","Nữ"),("Other","Khác")])
    phone = StringField("Điện thoại", validators=[InputRequired(), Length(max=15)])
    email = StringField("Email", validators=max_text(100))
    address = StringField("Địa chỉ", validators=max_text(255))
    blood_type = SelectField("Nhóm máu", choices=[("", "Chưa biết")] + [(x,x) for x in ("A+","A-","B+","B-","AB+","AB-","O+","O-")])
    allergies = TextAreaField("Dị ứng", validators=max_text(4000))
    chronic_diseases = TextAreaField("Bệnh nền", validators=max_text(4000))
    emergency_contact_name = StringField("Người liên hệ khẩn cấp", validators=[InputRequired(), Length(max=100)])
    emergency_contact_phone = StringField("Điện thoại khẩn cấp", validators=[InputRequired(), Length(max=15)])
    submit = SubmitField("Lưu thông tin")

    def validate_full_name(self, field):
        if field.data:
            from ...utils.validators import validate_person_name
            try:
                field.data = validate_person_name(field.data, "Họ và tên")
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_date_of_birth(self, field):
        if field.data:
            from ...utils.validators import validate_dob
            try:
                field.data = validate_dob(field.data, "Ngày sinh")
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_phone(self, field):
        if field.data:
            from ...utils.validators import validate_phone
            try:
                field.data = validate_phone(field.data, "Số điện thoại")
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_email(self, field):
        if field.data:
            from ...utils.validators import validate_email
            try:
                field.data = validate_email(field.data, "Email", required=False)
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_emergency_contact_name(self, field):
        if field.data:
            from ...utils.validators import validate_person_name
            try:
                field.data = validate_person_name(field.data, "Người liên hệ khẩn cấp")
            except Exception as exc:
                raise ValidationError(str(exc))

    def validate_emergency_contact_phone(self, field):
        if field.data:
            from ...utils.validators import validate_phone
            try:
                field.data = validate_phone(field.data, "Điện thoại khẩn cấp")
            except Exception as exc:
                raise ValidationError(str(exc))
