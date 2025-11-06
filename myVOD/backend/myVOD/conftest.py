"""
Pytest configuration for Django tests.

This file configures pytest-django to reuse the existing database
instead of creating a new test database. This is necessary when using
cloud databases like Supabase where:
1. User may not have CREATE DATABASE privileges
2. Database already has required extensions (unaccent, pg_trgm)
"""

import pytest


@pytest.fixture(scope='session')
def django_db_setup(django_db_blocker):
    """
    Override the default django_db_setup to prevent creating/destroying test database.

    By default, pytest-django creates a new test database (test_<dbname>) for each
    test session. This fixture overrides that behavior to reuse the existing database.

    Note: This means tests will run against the actual database specified in settings.
    Make sure your tests properly clean up after themselves!
    """
    from django.core.management import call_command

    with django_db_blocker.unblock():
        # Run migrations on the existing database (not a new test database)
        call_command('migrate', '--run-syncdb', verbosity=0, interactive=False)


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.

    This fixture ensures that all tests have access to the database
    without needing to explicitly mark them with @pytest.mark.django_db
    """
    pass
