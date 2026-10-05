from ..common import FlaskForm, StringField, PasswordField, SubmitField, InputRequired, Length


class LoginForm(FlaskForm):
    username = StringField("Tên đăng nhập", validators=[InputRequired(), Length(max=50)])
    password = PasswordField("Mật khẩu", validators=[InputRequired(), Length(max=128)])
    submit = SubmitField("Đăng nhập")
