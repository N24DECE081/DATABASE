import pytest
from app import create_app
from app.services.common import identity, PREFIX_MAP


def test_prefix_map_contains_all_entities():
    expected_prefixes = ["APT-", "SES-", "PAT-", "DOC-", "USER-PAT-", "SCH-", "HIS-", "MED-", "RX-", "RXI-", "SPC-"]
    for p in expected_prefixes:
        assert p in PREFIX_MAP
        table, col, std_p, pad = PREFIX_MAP[p]
        assert table is not None
        assert col is not None
        assert std_p == p


def test_identity_returns_sequential_id_with_correct_prefix():
    app = create_app({"TESTING": True, "SECRET_KEY": "test-key"})
    with app.app_context():
        apt_id = identity("APT-")
        assert apt_id.startswith("APT-")
        num = int(apt_id.split("-")[1])
        assert num >= 1

        ses_id = identity("SES-")
        assert ses_id.startswith("SES-")
        num = int(ses_id.split("-")[1])
        assert num >= 1

        pat_id = identity("PAT-")
        assert pat_id.startswith("PAT-")

        user_pat_id = identity("USER-PAT-")
        assert user_pat_id.startswith("USER-PAT-")

        doc_id = identity("DOC-")
        assert doc_id.startswith("DOC-")

        sch_id = identity("SCH-")
        assert sch_id.startswith("SCH-")
