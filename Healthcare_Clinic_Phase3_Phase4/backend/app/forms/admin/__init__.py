from ..common import *


class AccountForm(FlaskForm):
    username = StringField("Tên đăng nhập", validators=[InputRequired(), Length(max=50)])
    password = PasswordField("Mật khẩu", validators=[InputRequired(), Length(min=10,max=128)])
    role = SelectField("Vai trò", choices=[("PATIENT","Bệnh nhân"),("DOCTOR","Bác sĩ"),("ADMIN","Quản trị")])
    full_name = StringField("Họ tên", validators=max_text(100))
    phone = StringField("Điện thoại", validators=phone_validators(False), render_kw={"inputmode": "numeric", "autocomplete": "tel", "maxlength": "10", "placeholder": "0912345678"})
    email = StringField("Email", validators=email_validators(False), render_kw={"type": "email", "autocomplete": "email", "placeholder": "tennguoidung@gmail.com"})
    date_of_birth = DateField("Ngày sinh bệnh nhân", validators=[Optional(), not_future_date])
    gender = SelectField("Giới tính", choices=[("Male","Nam"),("Female","Nữ"),("Other","Khác")])
    emergency_contact_name = StringField("Người liên hệ khẩn cấp", validators=max_text(100))
    emergency_contact_phone = StringField("Điện thoại khẩn cấp", validators=phone_validators(False), render_kw={"inputmode": "numeric", "autocomplete": "tel", "maxlength": "10", "placeholder": "0912345678"})
    license_number = StringField("Giấy phép bác sĩ", validators=max_text(50))
    subtype = SelectField("Phân loại bác sĩ", choices=[("GENERAL_PRACTITIONER","Đa khoa"),("SPECIALIST","Chuyên khoa")])
    specialty_id = SelectField("Chuyên khoa", choices=[("","Không áp dụng")], validators=[Optional()])
    submit = SubmitField("Tạo tài khoản và hồ sơ")


class AccountStatusForm(FlaskForm):
    account_status = SelectField("Trạng thái", choices=[("Active","Hoạt động"),("Locked","Khóa"),("Suspended","Tạm ngưng")])
    submit = SubmitField("Cập nhật")


class SpecialtyForm(FlaskForm):
    specialty_name = StringField("Tên chuyên khoa", validators=[InputRequired(), Length(max=100)])
    description = TextAreaField("Mô tả", validators=max_text(4000))
    submit = SubmitField("Thêm chuyên khoa")
