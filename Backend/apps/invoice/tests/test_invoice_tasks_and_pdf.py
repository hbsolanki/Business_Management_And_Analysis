import pytest
from unittest.mock import patch, MagicMock
from apps.base.tests import BaseTestCase
from apps.invoice.tasks import send_invoice_email
from apps.invoice.utils.invoice_pdf import generate_invoice_pdf


@pytest.fixture
def invoice_pdf_env():
    class Env(BaseTestCase):
        def __init__(self):
            pass
    tc = Env()
    tc.setup_role_permissions()
    tc.setup_full_business_environment()
    return tc


@pytest.mark.django_db
class TestInvoiceTasksAndPdf:

    def test_generate_invoice_pdf_success(self, invoice_pdf_env):
        """Test generating PDF binary data for an existing invoice."""
        # Arrange
        sut_invoice = invoice_pdf_env.invoice_branch_a1

        # Act
        sut_pdf = generate_invoice_pdf(sut_invoice)

        # Assert
        assert sut_pdf is not None
        assert isinstance(sut_pdf, bytes)
        assert len(sut_pdf) > 0

    @patch("apps.invoice.utils.invoice_pdf.pisa.CreatePDF")
    def test_generate_invoice_pdf_error_returns_none(self, mock_create_pdf, invoice_pdf_env):
        """Test generate_invoice_pdf returns None when PDF generation has errors."""
        # Arrange
        sut_status = MagicMock()
        sut_status.err = 1
        mock_create_pdf.return_value = sut_status
        sut_invoice = invoice_pdf_env.invoice_branch_a1

        # Act
        sut_result = generate_invoice_pdf(sut_invoice)

        # Assert
        assert sut_result is None

    @patch("apps.invoice.tasks.send_email_task.delay")
    def test_send_invoice_email_success(self, mock_email_delay, invoice_pdf_env):
        """Test send_invoice_email generates PDF and calls send_email_task."""
        # Arrange
        sut_invoice = invoice_pdf_env.invoice_branch_a1
        sut_email = "customer@example.com"

        # Act
        send_invoice_email(to_email=sut_email, invoice_id=sut_invoice.id)

        # Assert
        assert mock_email_delay.called
        kwargs = mock_email_delay.call_args[1]
        assert kwargs["to_email"] == sut_email
        assert f"Invoice #{sut_invoice.id}" in kwargs["subject"]
        assert len(kwargs["attachments"]) == 1

    def test_send_invoice_email_nonexistent_invoice(self):
        """Test send_invoice_email handles non-existent invoice id gracefully."""
        # Arrange & Act
        result = send_invoice_email(to_email="test@example.com", invoice_id=999999)

        # Assert
        assert result is None

    @patch("apps.invoice.tasks.generate_invoice_pdf", side_effect=Exception("PDF generation failed"))
    def test_send_invoice_email_exception_handling(self, mock_pdf, invoice_pdf_env):
        """Test send_invoice_email handles exceptions gracefully."""
        # Arrange
        sut_invoice = invoice_pdf_env.invoice_branch_a1

        # Act
        result = send_invoice_email(to_email="test@example.com", invoice_id=sut_invoice.id)

        # Assert
        assert result is None
