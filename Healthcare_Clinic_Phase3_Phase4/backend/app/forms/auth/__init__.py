from datetime import date
from wtforms import RadioField
from wtforms.validators import EqualTo, Regexp, ValidationError
from ..common import (
    FlaskForm, StringField, PasswordField, SubmitField, SelectField,
    TextAreaField, DateField, InputRequired, Length, Optional, max_text,
    format_person_name
)


class LoginForm(FlaskForm):
    username = StringField("Tên đăng nhập", validators=[InputRequired(), Length(max=50)])
    password = PasswordField("Mật khẩu", validators=[InputRequired(), Length(max=128)])
    submit = SubmitField("Đăng nhập")


class PatientRegistrationForm(FlaskForm):
    # 1. Tài khoản đăng nhập
    username = StringField(
        "Tên đăng nhập",
        validators=[
            InputRequired(message="Vui lòng nhập tên đăng nhập."),
            Length(min=3, max=50, message="Tên đăng nhập phải có từ 3 đến 50 ký tự."),
            Regexp(r'^[a-zA-Z0-9_]+$', message="Tên đăng nhập viết liền không dấu, chỉ gồm chữ cái, chữ số và dấu gạch dưới (_).")
        ]
    )
    password = PasswordField(
        "Mật khẩu",
        validators=[
            InputRequired(message="Vui lòng nhập mật khẩu."),
            Length(min=8, max=128, message="Mật khẩu phải có độ dài tối thiểu 8 ký tự.")
        ]
    )
    confirm_password = PasswordField(
        "Xác nhận mật khẩu",
        validators=[
            InputRequired(message="Vui lòng nhập lại mật khẩu xác nhận."),
            EqualTo("password", message="Mật khẩu xác nhận không khớp với mật khẩu đã nhập.")
        ]
    )

    # 2. Thông tin cá nhân
    full_name = StringField(
        "Họ và tên",
        validators=[
            InputRequired(message="Vui lòng nhập họ và tên đầy đủ."),
            Length(min=2, max=100, message="Họ và tên phải có từ 2 đến 100 ký tự.")
        ]
    )
    date_of_birth = DateField(
        "Ngày sinh",
        validators=[InputRequired(message="Vui lòng chọn ngày sinh.")]
    )
    gender = RadioField(
        "Giới tính",
        choices=[("Male", "Nam"), ("Female", "Nữ"), ("Other", "Khác")],
        default="Male",
        validators=[InputRequired(message="Vui lòng chọn giới tính.")]
    )
    phone = StringField(
        "Số điện thoại",
        validators=[
            InputRequired(message="Vui lòng nhập số điện thoại."),
            Regexp(r'^0[35789]\d{8}$', message="Số điện thoại phải là số di động Việt Nam gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).")
        ]
    )
    email = StringField(
        "Email (không bắt buộc)",
        validators=[
            Optional(),
            Length(max=100, message="Email tối đa 100 ký tự."),
            Regexp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', message="Địa chỉ email không đúng định dạng (ví dụ: benhnhan@gmail.com).")
        ]
    )
    address = StringField(
        "Địa chỉ nơi ở (không bắt buộc)",
        validators=[Optional(), Length(max=255, message="Địa chỉ tối đa 255 ký tự.")]
    )

    # 3. Người liên hệ khẩn cấp
    emergency_contact_name = StringField(
        "Tên người liên hệ khẩn cấp",
        validators=[
            InputRequired(message="Vui lòng nhập tên người thân liên hệ khẩn cấp."),
            Length(min=2, max=100, message="Tên người liên hệ từ 2 đến 100 ký tự.")
        ]
    )
    emergency_contact_phone = StringField(
        "SĐT liên hệ khẩn cấp",
        validators=[
            InputRequired(message="Vui lòng nhập số điện thoại liên hệ khẩn cấp."),
            Regexp(r'^0[35789]\d{8}$', message="Số điện thoại khẩn cấp phải gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).")
        ]
    )

    # 4. Thông tin y tế (Tùy chọn)
    blood_type = SelectField(
        "Nhóm máu (nếu biết)",
        choices=[("", "-- Chọn nhóm máu (hoặc để trống) --")] + [(x, x) for x in ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")],
        default="",
        validators=[Optional()]
    )
    allergies = TextAreaField(
        "Tiền sử dị ứng (nếu có)",
        validators=[Optional(), Length(max=4000, message="Nội dung dị ứng tối đa 4000 ký tự.")]
    )
    chronic_diseases = TextAreaField(
        "Bệnh lý nền (nếu có)",
        validators=[Optional(), Length(max=4000, message="Nội dung bệnh nền tối đa 4000 ký tự.")]
    )

    submit = SubmitField("Tạo tài khoản bệnh nhân")

    def validate_date_of_birth(self, field):
        if field.data:
            today = date.today()
            if field.data >= today:
                raise ValidationError("Ngày sinh phải trước ngày hiện tại (không thể là hôm nay hoặc tương lai).")
            if field.data < date(today.year - 130, 1, 1):
                raise ValidationError("Ngày sinh không hợp lệ (tuổi không vượt quá 130 tuổi).")

    def validate_full_name(self, field):
        if field.data:
            field.data = format_person_name(field.data)
            if len(field.data) < 2:
                raise ValidationError("Họ và tên phải có từ 2 đến 100 ký tự.")
            if any(char.isdigit() for char in field.data):
                raise ValidationError("Họ và tên không được chứa chữ số.")

    def validate_emergency_contact_name(self, field):
        if field.data:
            field.data = format_person_name(field.data)
            if len(field.data) < 2:
                raise ValidationError("Tên người liên hệ khẩn cấp phải có từ 2 đến 100 ký tự.")
            if any(char.isdigit() for char in field.data):
                raise ValidationError("Tên người liên hệ khẩn cấp không được chứa chữ số.")


