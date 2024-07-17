export const baseUrl = 'http://a.sltech.ltd:1661'

export const netFetch = async (url: string) => {
  console.log(url)
  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.log(res)
      throw new Error('几把')
    }
    const data: any = await res.json()
    return data
  } catch (err) {
    console.log('???')
  }
}
