export async function redirectToCheckout() {
  const { createCheckoutSession } = await import('@/server/stripe')
  const res = await createCheckoutSession()
  if (res?.url) window.location.href = res.url
}

export async function redirectToPortal() {
  const { createPortalSession } = await import('@/server/stripe')
  const res = await createPortalSession()
  if (res?.url) window.location.href = res.url
}
