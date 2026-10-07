"""Reusable, CSRF-protected application forms."""
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SelectField, TextAreaField, IntegerField, DateField, TimeField, DateTimeLocalField, SubmitField
from wtforms.validators import InputRequired, Optional, Length, NumberRange, Regexp, ValidationError


PHONE_PATTERN = r"^[0-9]{10}$"
EMAIL_PATTERN = r"^[A-Za-z0-9._%+-]+@gmail\.com$"


def phone_validators(required=True):
    presence = [InputRequired()] if required else [Optional()]
    return presence + [Length(min=10, max=10), Regexp(PHONE_PATTERN, message="Số điện thoại phải gồm đúng 10 chữ số.")]


def email_validators(required=True):
    presence = [InputRequired()] if required else [Optional()]
    return presence + [Length(max=100), Regexp(EMAIL_PATTERN, message="Email phải đúng định dạng và có đuôi @gmail.com.")]


def not_future_date(_form, field):
    from datetime import date
    if field.data and field.data > date.today():
        raise ValidationError("Ngày sinh không được ở tương lai.")


class ActionForm(FlaskForm):
    submit = SubmitField("Xác nhận")


def max_text(length=255):
    return [Optional(), Length(max=length)]


def https_url(form, field):
    from urllib.parse import urlsplit
    if field.data:
        value = urlsplit(field.data)
        if value.scheme != "https" or not value.netloc or value.username or value.password:
            raise ValidationError("Liên kết cuộc gọi phải là URL https hợp lệ.")
