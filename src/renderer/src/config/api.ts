// const getBaseUrl = () => {
//   if (import.meta.env.VITE_API_BASE_URL) {
//     return import.meta.env.VITE_API_BASE_URL
//   }
//   if (import.meta.env.DEV) {
//     return 'https://odph-gs-bend.onrender.com/api/v1'
//   }
//   return 'https://odph-gs-bend.onrender.com/api/v1'
// }

// export const API_BASE_URL = getBaseUrl()


const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:4000/api/v1'
  }
  return 'http://localhost:4000/api/v1'
}

export const API_BASE_URL = getBaseUrl()
