class PytestTestRunner:
    """
    Custom Django test runner that delegates discovery and execution to pytest.
    Enables `python manage.py test` and `coverage run manage.py test` to run pytest test suites.
    """

    def __init__(self, verbosity=1, failfast=False, keepdb=False, **kwargs):
        self.verbosity = verbosity
        self.failfast = failfast
        self.keepdb = keepdb

    def run_tests(self, test_labels, extra_tests=None, **kwargs):
        import sys
        import pytest

        argv = ["--reuse-db"]
        if self.failfast:
            argv.append("-x")
        if self.verbosity == 0:
            argv.append("-q")
        elif self.verbosity >= 2:
            argv.append("-v")

        if test_labels:
            argv.extend(test_labels)

        return pytest.main(argv)
