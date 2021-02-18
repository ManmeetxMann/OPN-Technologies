export const convertCelsiusToFahrenheit = (celsius: number): number => (celsius * 9) / 5 + 32
export const convertFahrenheitToCelsius = (fahrenheit: number): number =>
  ((fahrenheit - 32) * 5) / 9
