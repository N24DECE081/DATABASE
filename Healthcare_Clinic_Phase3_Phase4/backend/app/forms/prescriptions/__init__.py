from wtforms import Form, FormField, FieldList
from wtforms.validators import Regexp
from ..common import *


class ItemForm(Form):
    medication_id = SelectField("Thuốc", validators=[InputRequired()])
    dosage = StringField("Liều dùng", validators=[InputRequired(), Length(max=50)])
    frequency = StringField("Tần suất", validators=[InputRequired(), Length(max=50)])
    duration = StringField("Thời gian dùng", validators=[InputRequired(), Length(max=50)])
    special_instructions = StringField("Hướng dẫn riêng", validators=max_text(255))


class PrescriptionForm(FlaskForm):
    diagnosis_icd = StringField("Mã ICD (nếu có)", validators=[Optional(), Regexp(r'^[A-Z][0-9]{2}(\.[0-9]{1,2})?$', message="Mã ICD-10 không đúng định dạng (Ví dụ: J02.9, E11, I10, K29, M54.5)."), Length(max=20)])
    instructions = TextAreaField("Hướng dẫn chung", validators=max_text(4000))
    items = FieldList(FormField(ItemForm), min_entries=1, max_entries=10)
    submit = SubmitField("Lưu đơn thuốc")
