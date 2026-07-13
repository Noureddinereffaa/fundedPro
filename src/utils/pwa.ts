export function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.onupdatefound = () => {
            const installing = reg.installing
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  window.dispatchEvent(new CustomEvent('sw-update'))
                }
              }
            }
          }
        })
        .catch(() => {})
    })
  }
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister())
    })
  }
}

export function listenForInstallPrompt(callback: (e: Event) => void) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    callback(e)
  })
}
