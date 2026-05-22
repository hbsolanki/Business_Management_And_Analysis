from unittest.mock import patch
from apps.base.tests import BaseTestCase
from apps.activity_log.models import ActivityLog

class ReportTestCase(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.setup_full_business_environment(has_advanced_analytics=True)
        # URLs
        self.url_generate = "/analytics/report/generate/"

    def test_permission(self):
        """Check report permissions."""
        # Owner access
        self.client.force_authenticate(user=self.owner_a)
        payload = {"start_date": "2024-03-01", "end_date": "2024-03-31"}
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)
        # Employee allow (Only Feature Permission)
        self.client.force_authenticate(user=self.employee_a1)
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)

    @patch('apps.analytics.tasks.send_analytics_report_email.delay')
    def test_report_generate(self, mock_task):
        """Verify report generation."""
        self.client.force_authenticate(user=self.owner_a)
        payload = {
            "report_type": ["product", "cost"],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)
        # Field check
        self.assertEqual(res.data['detail'], "Analytics report is being generated and will be sent to your email.")
        # Log check
        self.assertTrue(ActivityLog.objects.filter(module="ANALYTICS").exists())
        # Task check
        self.assertTrue(mock_task.called)

    @patch('apps.analytics.tasks.send_analytics_report_email.delay')
    def test_report_generate_filter(self, mock_task):
        """Filter report generation."""
        self.client.force_authenticate(user=self.owner_a)
        # 1. Branch filter
        payload = {
            "branch_ids": [self.branch_a1.id],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)
        # 2. Product filter
        payload = {
            "product_ids": [self.product_a1.id],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)
        # 3. Specific type
        payload = {
            "report_type": ["inventory"],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202)
        # 4. Filter mismatch
        payload = {
            "branch_ids": [999],
            "start_date": "2024-03-01",
            "end_date": "2024-03-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 202) # Accepted even if no data for filters
        # 5. Invalid date
        payload = {
            "start_date": "invalid",
            "end_date": "2024-03-31"
        }
        res = self.client.post(self.url_generate, payload)
        self.assertEqual(res.status_code, 400)
