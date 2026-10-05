from ..common import *


class HistoryForm(FlaskForm):
    diagnosis = StringField("Chẩn đoán", validators=[InputRequired(), Length(max=255)])
    symptoms = TextAreaField("Triệu chứng", validators=[InputRequired(), Length(max=8000)])
    progress_notes = TextAreaField("Ghi chú diễn tiến", validators=max_text(8000))
    submit = SubmitField("Ghi bệnh sử")
