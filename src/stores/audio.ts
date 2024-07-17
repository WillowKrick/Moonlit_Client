import { defineStore } from 'pinia'

export const useAudioStore = defineStore('audios', {
  persist: true,
  state: () => {
    return {
      audioState: true
    }
  },
  getters: {},
  actions: {
    freshAudio(payload: boolean) {
      this.audioState = payload
    }
  }
})
