export const DS = (selector: string) => {
  return document.querySelector(selector)
}
export const DSA = (selector: string) => {
  return document.querySelectorAll(selector)
}

export const removeExt = (string: string) => {
  return string.replace(/\.(mp3|wav|ogg|aac|m4a|flac)/i, '')
}

export const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
})

export const getExt = (fileName: string) => {
  const audio = new RegExp(/\.(mp3|wav|ogg|aac|m4a|flac)/i)

  return fileName.match(audio)
}

/**
 * @description: 判断任何对象的类型
 * @param {any} 任何
 * @return {*}
 */
export const judgeType = (va: any) => {
  return Object.prototype.toString.call(va).slice(8, -1)
}
