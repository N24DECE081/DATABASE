"""Reusable, CSRF-protected application forms."""
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SelectField, TextAreaField, IntegerField, DateField, TimeField, DateTimeLocalField, SubmitField
from wtforms.validators import InputRequired, Optional, Length, NumberRange, ValidationError


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
