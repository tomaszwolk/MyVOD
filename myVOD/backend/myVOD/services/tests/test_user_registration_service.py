"""
Unit tests for user_registration_service.

Tests the business logic for user registration functionality.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError, DatabaseError
from services.user_registration_service import register_user  # type: ignore
from unittest.mock import patch

User = get_user_model()


class UserRegistrationServiceTests(TestCase):
    """
    Test suite for register_user service function.

    Tests cover:
    - Successful user registration
    - Duplicate email handling
    - Invalid input validation
    - Password hashing
    - Email normalization
    - Database errors
    """

    def setUp(self):
        """
        Set up test data for each test.

        Note: Django TestCase automatically handles database cleanup
        between tests using transactions, so manual cleanup is not needed.
        """
        pass

    def tearDown(self):
        """
        Clean up test data after each test.
        
        Note: Django TestCase automatically handles database cleanup
        between tests using transactions, so manual cleanup is not needed.
        """
        pass

    def test_register_user_success(self):
        """Test successful user registration with valid data."""
        email = "newuser@example.com"
        password = "strongPassword123"

        result = register_user(email, password)

        # Verify response structure
        self.assertIn('email', result)
        self.assertEqual(result['email'], email.lower())

        # Verify user was created in database
        user = User.objects.get(email=email.lower())
        self.assertEqual(user.email, email.lower())

        # Verify password was hashed (should not match plain text)
        self.assertNotEqual(user.password, password)
        self.assertTrue(user.check_password(password))

    def test_register_user_email_normalization(self):
        """Test that email is normalized to lowercase."""
        email = "TestUser@EXAMPLE.COM"
        password = "strongPassword123"

        result = register_user(email, password)

        # Verify email is lowercase in response
        self.assertEqual(result['email'], "testuser@example.com")

        # Verify email is lowercase in database
        user = User.objects.get(email="testuser@example.com")
        self.assertEqual(user.email, "testuser@example.com")

    def test_register_user_email_whitespace_stripped(self):
        """Test that email whitespace is stripped."""
        email = "  user@example.com  "
        password = "strongPassword123"

        result = register_user(email, password)

        # Verify email is trimmed
        self.assertEqual(result['email'], "user@example.com")

        # Verify user was created with trimmed email
        user = User.objects.get(email="user@example.com")
        self.assertIsNotNone(user)

    def test_register_user_duplicate_email(self):
        """Test that registering with existing email raises IntegrityError."""
        email = "duplicate@example.com"
        password = "strongPassword123"

        # Create first user
        register_user(email, password)

        # Attempt to create second user with same email
        with self.assertRaises(IntegrityError) as context:
            register_user(email, password)

        self.assertIn("already exists", str(context.exception))

    def test_register_user_duplicate_email_case_insensitive(self):
        """Test that email uniqueness is case-insensitive."""
        email1 = "user@example.com"
        email2 = "USER@EXAMPLE.COM"
        password = "strongPassword123"

        # Create first user
        register_user(email1, password)

        # Attempt to create second user with same email (different case)
        with self.assertRaises(IntegrityError) as context:
            register_user(email2, password)

        self.assertIn("already exists", str(context.exception))

    def test_register_user_empty_email(self):
        """Test that empty email raises ValueError."""
        with self.assertRaises(ValueError) as context:
            register_user("", "strongPassword123")

        self.assertIn("Email is required", str(context.exception))

    def test_register_user_whitespace_only_email(self):
        """Test that whitespace-only email raises ValueError."""
        with self.assertRaises(ValueError) as context:
            register_user("   ", "strongPassword123")

        self.assertIn("Email is required", str(context.exception))

    def test_register_user_empty_password(self):
        """Test that empty password raises ValueError."""
        with self.assertRaises(ValueError) as context:
            register_user("user@example.com", "")

        self.assertIn("Password is required", str(context.exception))

    def test_register_user_password_hashing(self):
        """Test that password is properly hashed using Django's auth system."""
        email = "hashtest@example.com"
        password = "testPassword123"

        register_user(email, password)

        user = User.objects.get(email=email)

        # Password should be hashed (bcrypt format: starts with bcrypt identifier)
        self.assertNotEqual(user.password, password)
        self.assertTrue(len(user.password) > 50)  # Hashed passwords are long

        # Should be able to verify password
        self.assertTrue(user.check_password(password))
        self.assertFalse(user.check_password("wrongPassword"))

    @patch('services.user_registration_service.User.objects.create_user')
    def test_register_user_database_error(self, mock_create_user):
        """Test that database errors are properly raised."""
        mock_create_user.side_effect = DatabaseError("Database connection failed")

        with self.assertRaises(DatabaseError):
            register_user("user@example.com", "strongPassword123")

    def test_register_user_multiple_users(self):
        """Test that multiple users can be registered successfully."""
        users_data = [
            ("user1@example.com", "password123ABC"),
            ("user2@example.com", "password456DEF"),
            ("user3@example.com", "password789GHI"),
        ]

        for email, password in users_data:
            result = register_user(email, password)
            self.assertEqual(result['email'], email)

        # Verify all users were created
        self.assertEqual(
            User.objects.filter(
                email__in=[email for email, _ in users_data]
            ).count(),
            3
        )

    def test_register_user_special_characters_in_email(self):
        """Test registration with special characters in email."""
        email = "user+test@example.co.uk"
        password = "strongPassword123"

        result = register_user(email, password)

        self.assertEqual(result['email'], email)
        user = User.objects.get(email=email)
        self.assertEqual(user.email, email)
