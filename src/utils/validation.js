import * as yup from 'yup';

// Password regex: min 8 chars, at least one letter, one number, one special char
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

export const loginSchema = yup.object({
  // email or username (the server accepts either)
  email: yup
    .string()
    .trim()
    .required('Email or username is required'),
  password: yup
    .string()
    .required('Password is required'),
  rememberMe: yup.boolean(),
});

export const registerSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .required('Full name is required'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  username: yup
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .matches(/^[A-Za-z0-9_.-]+$/, 'Letters, numbers, dots, dashes and underscores only')
    .required('Username is required'),
  profession: yup
    .string()
    .required('Please select your profession'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      passwordRegex,
      'Password must contain at least one letter, one number, and one special character'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  termsAccepted: yup
    .boolean()
    .oneOf([true], 'You must accept the terms and conditions'),
});

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  code: yup
    .string()
    .trim()
    .matches(/^\d{6}$/, 'Enter the 6-digit code from the email')
    .required('Enter the 6-digit code from the email'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      passwordRegex,
      'Password must contain at least one letter, one number, and one special character'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
});