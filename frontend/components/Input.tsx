/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mail, KeyRound, User, Check, Eye, EyeOff } from 'lucide-react'
import { useState, useRef, useEffect, type ReactNode } from 'react'

type ValidatorFunction = (value: string) => boolean

type ValidatorsType = {
  [key: string]: ValidatorFunction
}

const Validators: ValidatorsType = {
  email: (value) => {
    const settings = {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      minLength: 5,
      maxLength: 50,
      required: true,
    }

    if (!value && settings.required) return false
    if (value.length < settings.minLength) return false
    if (value.length > settings.maxLength) return false
    return settings.pattern.test(value)
  },

  password: (value) => {
    const settings = {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      required: true,
    }

    if (!value && settings.required) return false
    if (value.length < settings.minLength) return false
    if (settings.requireUppercase && !/[A-Z]/.test(value)) return false
    if (settings.requireNumbers && !/[0-9]/.test(value)) return false
    return true
  },

  username: (value) => {
    const settings = {
      minLength: 3,
      maxLength: 20,
      allowSpaces: false,
      allowSpecial: false,
      pattern: /^[a-zA-Z0-9_-]*$/,
      required: true,
    }

    if (!value && settings.required) return false
    if (value.length < settings.minLength) return false
    if (value.length > settings.maxLength) return false
    if (!settings.allowSpaces && /\s/.test(value)) return false
    if (!settings.allowSpecial && !settings.pattern.test(value)) return false
    return true
  },
}

type CombinedInputProps = {
  // Shared
  name?: string
  type?: string
  placeholder?: string
  value?: string
  onChange?: (val: string) => void
  className?: string
  inputClassName?: string
  readonly?: boolean
  icon?: ReactNode

  // Password/Input validation/extras
  passwordStrength?: boolean
  onEnter?: () => void
  onValidationChange?: (isValid: boolean) => void
}

// Combined Input component
export default function Input({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  className = '',
  inputClassName = '',
  readonly = false,
  icon,
  // password / validation props
  passwordStrength = false,
  onEnter,
  onValidationChange,
  name,
}: CombinedInputProps) {
  const [input, setInput] = useState<string>(value)
  const [hidden, setHidden] = useState<boolean>(type === 'password')
  const [focused, setFocused] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInput(value ?? '')
  }, [value])

  // Determine validator
  let validator: ValidatorFunction = () => true
  if (type === 'email' || type === 'password' || type === 'username' || type === 'pro') {
    validator = Validators[type] || (() => true)
  }

  const valid = input === '' ? false : validator(input)

  // Password Rules & Strength (if used)
  const passwordRules = {
    hasUppercase: /[A-Z]/.test(input),
    hasNumber: /[0-9]/.test(input),
    hasMinLength: input.length >= 8,
    hasLowercase: /[a-z]/.test(input),
    hasSpecialChar: /[!@#$%^&*]/.test(input),
  }
  const strengthLvl =
    input.length > 0
      ? [passwordRules.hasUppercase, passwordRules.hasNumber, passwordRules.hasMinLength].filter(
          Boolean,
        ).length
      : 0

  // For password inputs, only show strength UI if applicable
  const showPasswordStrength =
    type === 'password' &&
    passwordStrength &&
    (focused || (!valid && input !== ''))
  const showToggle =
    type === 'password' &&
    (focused || (!valid && input !== ''))

  // Height handling: only expand for password/strength UI
  const containerHeight = showPasswordStrength ? 'h-32' : 'h-9'

  useEffect(() => {
    if (onValidationChange) {
      onValidationChange(valid)
    }
    // eslint-disable-next-line
  }, [valid, onValidationChange])

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.preventDefault()
    setHidden(!hidden)
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 0)
  }

  // Fallback icon based on type if not provided
  const fallbackIcon = (
    <>
      {type === 'email' && <Mail size={16} />}
      {type === 'password' && <KeyRound size={16} />}
      {type === 'username' && <User size={16} />}
      {type === 'pro' && <User size={16} />}
    </>
  )

  // Select which icon to render
  const usedIcon = icon !== undefined ? icon : fallbackIcon

  return (
    <div
      className={`relative w-full transition-all duration-300 ease-in-out ${containerHeight} ${className}`}
    >
      <div className="relative w-full h-fit">
        {/* Custom or fallback icon */}
        <div className="absolute top-1/2 left-3 transform -translate-y-1/2 z-10 dark:text-white text-gray-600">
          {usedIcon}
        </div>
        <input
          ref={inputRef}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
          type={
            type === 'password'
              ? hidden
                ? 'password'
                : 'text'
              : type
          }
          name={name}
          value={input}
          readOnly={readonly}
          onChange={(e) => {
            setInput(e.target.value)
            if (onChange) onChange(e.target.value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onEnter) {
              onEnter()
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full h-10 rounded-lg border border-black/15 dark:border-white/15
            bg-white dark:bg-neutral-900
            text-black dark:text-white
            pl-9 ${type === 'password' ? 'pr-12' : 'pr-4'}
            transition-all duration-200
            focus:border-black/30 dark:focus:border-white/30 
            focus:shadow-[0_0_0_2px_rgba(0,0,0,0.05)] dark:focus:shadow-[0_0_0_2px_rgba(255,255,255,0.05)]
            focus:outline-none focus:ring-0
            [&:focus-visible]:outline-none [&:focus-visible]:ring-0
            ${inputClassName}`}
        />
        {/* Label/Slider */}
        <p
          className={`absolute pointer-events-none px-1 text-sm dark:text-white/50 text-black text-opacity-65 transition-all duration-300 ${
            focused || input !== ''
              ? 'top-0 left-3 -translate-y-1/2 text-xs bg-white dark:bg-[#171717]'
              : 'top-1/2 left-9 -translate-y-1/2'
          }`}
        >
          {placeholder}
        </p>
        {/* Password toggle */}
        {type === 'password' && (
          <div
            className={`absolute top-1/2 right-3 transform -translate-y-1/2 z-10 cursor-pointer select-none transition-opacity duration-300 ${
              showToggle ? 'opacity-100' : 'opacity-0'
            }`}
            onMouseDown={handleToggleVisibility}
          >
            {hidden ? <Eye size={20} /> : <EyeOff size={20} />}
          </div>
        )}
      </div>

      {/* Password Strength UI */}
      {passwordStrength && type === 'password' && (
        <div
          className={`w-full overflow-hidden transition-opacity duration-300 ${
            showPasswordStrength ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bars */}
          <div className="flex w-full gap-1 h-2 mt-2">
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  strengthLvl > 0
                    ? 'w-full bg-gradient-to-r from-orange-500 to-orange-400'
                    : 'w-0'
                }`}
              />
            </div>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  strengthLvl > 1
                    ? 'w-full bg-gradient-to-r from-orange-400 to-yellow-300'
                    : 'w-0'
                }`}
              />
            </div>
            <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  strengthLvl > 2
                    ? 'w-full bg-gradient-to-r from-yellow-300 to-green-500'
                    : 'w-0'
                }`}
              />
            </div>
          </div>
          {/* Password rules */}
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-white transition-all duration-300 ${
                  passwordRules.hasUppercase
                    ? 'bg-green-600'
                    : 'bg-gray-400 dark:bg-neutral-700'
                }`}
              >
                <Check size={12} />
              </span>
              <span
                className={`transition-colors duration-300 ${
                  passwordRules.hasUppercase
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                At least one uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-white transition-all duration-300 ${
                  passwordRules.hasNumber
                    ? 'bg-green-600'
                    : 'bg-gray-400 dark:bg-neutral-700'
                }`}
              >
                <Check size={12} />
              </span>
              <span
                className={`transition-colors duration-300 ${
                  passwordRules.hasNumber
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                At least one number
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`flex items-center justify-center w-4 h-4 rounded-full text-white transition-all duration-300 ${
                  passwordRules.hasMinLength
                    ? 'bg-green-600'
                    : 'bg-gray-400 dark:bg-neutral-700'
                }`}
              >
                <Check size={12} />
              </span>
              <span
                className={`transition-colors duration-300 ${
                  passwordRules.hasMinLength
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                At least 8 characters
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
