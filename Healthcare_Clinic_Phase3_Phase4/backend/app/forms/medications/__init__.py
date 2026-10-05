from ..common import *


class MedicationForm(FlaskForm):
    medication_name = StringField("Tên thuốc", validators=[InputRequired(), Length(max=100)])
    description = TextAreaField("Mô tả", validators=max_text(4000))
    submit = SubmitField("Thêm thuốc")
