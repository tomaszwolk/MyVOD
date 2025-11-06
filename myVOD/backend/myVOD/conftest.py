"""
Pytest configuration for Django tests.

This file configures pytest-django to reuse the existing database
instead of creating a new test database. This is necessary when using
cloud databases like Supabase where:
1. User may not have CREATE DATABASE privileges
2. Database already has required extensions (unaccent, pg_trgm)
"""

import pytest
from django.conf import settings


@pytest.fixture(scope='session')
def django_db_setup():
    """
    Override the default django_db_setup to prevent creating/destroying test database.
    
    By default, pytest-django creates a new test database (test_<dbname>) for each
    test session. This fixture overrides that behavior to reuse the existing database.
    
    Note: This means tests will run against the actual database specified in settings.
    Make sure your tests properly clean up after themselves!
    """
    # Get the database configuration
    from django.test.utils import setup_test_environment, teardown_test_environment
    
    # Setup test environment (sets DEBUG=False, among other things)
    setup_test_environment()
    
    # Don't create/destroy database - just ensure migrations are run
    from django.core.management import call_command
    from django.db import connection
    
    # Run migrations if needed (silently)
    call_command('migrate', '--run-syncdb', verbosity=0, interactive=False)
    
    yield
    
    # Cleanup test environment
    teardown_test_environment()


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    
    This fixture ensures that all tests have access to the database
    without needing to explicitly mark them with @pytest.mark.django_db
    """
    pass

