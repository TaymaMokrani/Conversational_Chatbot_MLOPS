import { useState } from 'react'

// Define the hybrid type: It's a function that returns T, but also has a .set property
type CallableState<T> = {
  (): T
  set: React.Dispatch<React.SetStateAction<T>>
}

export const useVar = <T>(initialValue: T): CallableState<T> => {
  const [value, setValue] = useState<T>(initialValue)

  // Define the function that acts as the "getter"
  const stateFn = () => value

  // Attach the setter to the function
  stateFn.set = setValue

  // Return the hybrid function
  return stateFn as CallableState<T>
}
