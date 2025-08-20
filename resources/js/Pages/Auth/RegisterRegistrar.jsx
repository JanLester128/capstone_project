import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import axios from 'axios';

axios.defaults.withCredentials = true;

const Icon = {
  user: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.121 17.804A9 9 0 1118.88 6.196 9 9 0 015.12 17.804z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  email: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 12l-4-4-4 4m8 0l-4 4-4-4"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 8v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8"
      />
    </svg>
  ),
  lock: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect width={14} height={10} x={5} y={11} rx={2} ry={2} />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4" />
    </svg>
  ),
};

export default function RegisterRegistrar() {
  const { data, setData, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
  });

  const [processing, setProcessing] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setServerErrors({});
    setSuccess(false);

    try {
      await axios.get('/sanctum/csrf-cookie');
      await axios.post('/auth/register/registrar', data);
      reset();
      setSuccess(true);
    } catch (error) {
      if (error.response?.status === 422) {
        setServerErrors(error.response.data.errors || {});
      } else {
        console.error('Registration error:', error);
        alert('An error occurred. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:py-16">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-gray-200 p-10 sm:p-14">
        <h2 className="text-4xl font-extrabold text-gray-900 mb-8 text-center tracking-tight font-inter">
          Registrar Registration
        </h2>

        {success && (
          <div className="mb-6 rounded-md bg-green-50 p-4 text-center text-green-700 font-semibold animate-fadeIn">
            Registrar account created successfully!
          </div>
        )}

        <form onSubmit={submit} noValidate className="space-y-8 font-inter">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div
              className={`flex items-center rounded-md border px-4 py-3 shadow-sm transition-colors duration-300 ${
                errors.name || serverErrors.name
                  ? 'border-red-500 focus-within:border-red-600'
                  : 'border-gray-300 focus-within:border-indigo-600'
              } focus-within:ring-1 focus-within:ring-indigo-600 bg-white`}
            >
              <span className="mr-3">{Icon.user}</span>
              <input
                id="name"
                type="text"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                placeholder="John Doe"
                required
                className="w-full border-none outline-none text-gray-900 placeholder-gray-400 text-base"
              />
            </div>
            {(errors.name || serverErrors.name) && (
              <p className="mt-1 text-red-600 text-sm font-medium">{errors.name || serverErrors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div
              className={`flex items-center rounded-md border px-4 py-3 shadow-sm transition-colors duration-300 ${
                errors.email || serverErrors.email
                  ? 'border-red-500 focus-within:border-red-600'
                  : 'border-gray-300 focus-within:border-indigo-600'
              } focus-within:ring-1 focus-within:ring-indigo-600 bg-white`}
            >
              <span className="mr-3">{Icon.email}</span>
              <input
                id="email"
                type="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full border-none outline-none text-gray-900 placeholder-gray-400 text-base"
              />
            </div>
            {(errors.email || serverErrors.email) && (
              <p className="mt-1 text-red-600 text-sm font-medium">{errors.email || serverErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div
              className={`flex items-center rounded-md border px-4 py-3 shadow-sm transition-colors duration-300 ${
                errors.password || serverErrors.password
                  ? 'border-red-500 focus-within:border-red-600'
                  : 'border-gray-300 focus-within:border-indigo-600'
              } focus-within:ring-1 focus-within:ring-indigo-600 bg-white`}
            >
              <span className="mr-3">{Icon.lock}</span>
              <input
                id="password"
                type="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="w-full border-none outline-none text-gray-900 placeholder-gray-400 text-base"
              />
            </div>
            {(errors.password || serverErrors.password) && (
              <p className="mt-1 text-red-600 text-sm font-medium">{errors.password || serverErrors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={processing}
            className={`w-full rounded-2xl bg-indigo-600 py-4 text-white font-semibold shadow-lg transition duration-200 focus:outline-none focus:ring-4 focus:ring-indigo-400 hover:bg-indigo-700 active:scale-95 flex justify-center items-center ${
              processing ? 'cursor-not-allowed bg-indigo-400 hover:bg-indigo-400' : ''
            }`}
          >
            {processing && (
              <svg
                className="animate-spin mr-3 h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            )}
            {processing ? 'Creating...' : 'Create Registrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
