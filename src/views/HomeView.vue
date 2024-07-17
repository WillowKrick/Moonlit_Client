<script setup lang="ts">
import {
  FolderOutlined,
  PictureOutlined,
  PlaySquareOutlined,
  SoundOutlined,
  FileOutlined,
  CloseCircleOutlined,
  CustomerServiceOutlined,
  StepBackwardOutlined,
  PauseOutlined,
  CaretRightOutlined,
  StepForwardOutlined,
  UnorderedListOutlined,
  CloseSquareOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue';
import { baseUrl, netFetch } from '@/api/interceptors'
import { useAudioStore } from '@/stores/audio';
import { reactive, ref, toRef, toRefs } from 'vue'
import router from '@/router'
import { judgeType } from '@/common/tools'
import playDot from '@/assets/moonlit.png'
import { DS, DSA, collator, removeExt } from '@/common/tools'
const audioStore = useAudioStore()
// const { audioState } = toRefs(audioStore)
// const { freshAudio } = toRef(audioStore)
const menu = ref([]) as any
const contents = ref([]) as any
let pathList = ref([]) as any
let api = baseUrl + '/view'
let currentUrl = ref('')
let preVisible = ref(false)
let total = ref<number>(1)
let count = ref<number>(1)
let pageSize = ref<number>(1)
let current = ref<number>(1)
let picList = ref([]) as any
let videoList = ref([]) as any
let videoLink = ref<string>('')
const video = ref()
let mediaTitle = ref<string>('')
let audioList = ref<any>([])
let audioLink = ref('')
let playIndex = ref<number>(0)
let audio = ref()
let currentTime = ref(0)
let audioDuration = ref(0)
let style = reactive({
  width: '0%'
})
let paused = ref(true)
const open = ref<boolean>(false)
let lrcTxts = ref([]) as any
let lrcIndex = ref(0)
let txtContent = ref([]) as any

/**
 * @description: 打开网址时加载对应的内容
 * @return {*}
 */
const getMenu = async () => {
  const path = router.currentRoute.value.path
  const target = path == '/' ? baseUrl : api + router.currentRoute.value.fullPath
  console.log("target", target);

  let res = await netFetch(target)
  if (res && res.code == '200') {
    if (path == '/') {
      res.data.forEach((element: string) => {
        currentUrl.value = path
        menu.value.push(element)
        initPages()
      })
    } else {
      path
        .split('/')
        .forEach((i) => {
          i != '' && pathList.value.push('/' + decodeURI(i))
        })
      initMenu()
      contents.value = res.data
      getPages(res)
      currentUrl.value = path
      let f = router.currentRoute.value.query.f
      if (f) {
        await netFetch(api + path + f).then(async res => {
          console.log(api + f);

          console.log(res);
          await openFile(res)
        })
      }
    }
  } else {
    message.error({
      content: () => '目录已不再共享,或未挂载',
      duration: 3
    })
  }
}
/**
 * @description: 在主页点击文件夹后渲染的子目录, 文件预览操作
 * @description: 
 * @param {*} list
 * @param {*} id
 * @param {*} list
 * @param {*} index
 * @param {*} videoList
 * @param {*} audioList
 * @param {*} link
 * @param {*} idx
 * @param {*} list
 * @param {*} n
 * @param {*} match
 * @param {*} if
 * @param {*} Number
 * @param {*} txt
 * @param {*} b
 * @return {*}
 */
const subRender = async (list: any, id: number) => {
  if (!pathList.value.includes(list.name) && router.currentRoute.value.path != '/') {
    initMedia()
    await openFile(list, id)
    if (audioLink.value) {
      audioPlay()
    }
  } else {
    fetchDir('', list)
  }


}
const openFile = async (list: any, id?: number) => {
  console.log("OOOK");
  console.log("list", list)
  let path = pathList.value.join('')
  const link = baseUrl + path + list.name
  console.log(link);
  let query = router.currentRoute.value.query.page
    ?
    {
      page: router.currentRoute.value.query.page,
      pageSize: router.currentRoute.value.query.pageSize,
      f: list.name
    }
    :
    { f: list.name }

  if (list.type !== 'dir') {
    router.push({
      path: path,
      query: query
    })
  }

  switch (list.type) {
    case 'dir':
      await fetchDir(path, list.name)
      break
    case 'picture':
      preVisible.value = true
      initMedia()
      if (id || id! >= 0) {
        contents.value.forEach((item: any, index: number) => {
          if (item.type == 'picture' && index >= id!) {
            picList.value.push(item)
          }
        })
      } else if (!id || id! >= 0) { picList.value.push(list) }
      break
    case 'video':
      preVisible.value = true
      initMedia()
      if (audio.value) {
        audio.value.pause()
      }
      audio.value = undefined
      mediaTitle.value = list.name.replace('/', '')
      videoList.value = (id || id! >= 0) ? contents.value.slice(id).filter((item: any) => item.type == 'video') : [list]
      videoLink.value = link
      break

    case 'audio':
      preVisible.value = true
      initMedia()
      audioLink.value = link
      mediaTitle.value = list.name.replace('/', '')
      audioList.value = (id || id! >= 0) ? contents.value.filter((item: any) => item.type == 'audio').map((itm: any) => { return { "name": itm.name, 'link': baseUrl + path + itm.name } }) : [list];

      (id || id! >= 0) ? audioList.value.forEach((itm: any, idx: number) => {
        if (itm.name == contents.value[id!].name) {
          playIndex.value = idx
        }
      }) : 0
      playAudio(audioLink.value)
      break
    case 'txt':
      preVisible.value = true
      initMedia()
      txtRender(link)
      break
    case 'unknown':
      window.open(link)
      break
  }
}

const txtRender = async (link: string) => {
  let res = await (await fetch(link)).text()
  res.split('\n').forEach((itm: string) => {
    itm !== null && txtContent.value.push(itm)
  })

}

const getLrc = async (link: string) => {
  lrcTxts.value = []
  const regex = /\[(\d{2}:\d{2}\.\d{2,3})\](.*?)(?=\n|\r|$)/g;
  let res = await fetch(removeExt(link) + '.lrc')
  if (res.ok) {
    let matches: any = [];
    (await res.text()).split('\n').forEach(itm => {
      itm.match(regex) !== null && matches.push(itm)
    })

    lrcTxts.value = matches.map((item: any) => {
      const parts = item.replace('\r', '').match(/\[(\d{2}:\d{2}\.\d{2,3})\](.*)/);
      if (parts && parts[2] != '') {
        let time = Number((parseInt(parts[1].split(':')[0], 10) * 60)) + Number(parseFloat(parts[1].split(':')[1]))
        return { time: time.toFixed(2), txt: parts[2].trim() }
      }
    }).filter((itm: any) => itm != undefined).sort((a: any, b: any) => collator.compare(a.time, b.time));
    console.log(lrcTxts.value);
  } else {
    lrcTxts.value.push({ time: null, txt: "没有歌词辣" })
  }
}

/**
 * @description: 音乐播放逻辑
 * @param {*} url
 * @param {*} paused
 * @param {*} paused
 * @param {*} audioTimeUpdate
 * @return {*}
 */
const playAudio = (url: string) => {
  if (!audio.value) {
    audio.value = new Audio()
  }
  audio.value.src = url
  audio.value.onloadedmetadata = () => {
    audioDuration.value = audio.value.duration
    getLrc(audio.value.src)
  }
  audio.value.addEventListener('play', () => {
    paused.value = false
  })
  audio.value.addEventListener('pause', () => {
    paused.value = true
  })
  audio.value.addEventListener('timeupdate', audioTimeUpdate)
  audio.value.onended = () => {
    playNextMedia(audioList.value, 'audio')
    paused.value = true
  }
}

/**
 * @description: 在播放音乐的时候, 时间更新时歌词滚动的操作
 * @param {*} if
 * @param {*} idx
 * @return {*}
 */
const audioTimeUpdate = () => {
  if (audio.value) {
    currentTime.value = audio.value.currentTime
    style.width = `${(currentTime.value / audioDuration.value) * 100}%`

    const newLrcIndex = lrcTxts.value.findIndex((itm: any, idx: number) => {
      return currentTime.value >= itm.time && (!lrcTxts.value[idx + 1] || currentTime.value < lrcTxts.value[idx + 1].time)
    })
    if (lrcIndex.value != newLrcIndex) {
      if (lrcIndex.value != -1) {
        DSA('.lrcTxt')[lrcIndex.value]?.classList.remove('active')
      }

      lrcIndex.value = newLrcIndex

      if (lrcIndex.value != -1) {
        DSA('.lrcTxt')[lrcIndex.value]?.classList.add('active')
      }

      if (preVisible.value) {
        let totalHeight = 0
        for (let index = 0; index <= lrcIndex.value; index++) {
          totalHeight += DSA('.lrcTxt')[index].clientHeight
        }
        DS('.lyricBox')!.scrollTop = totalHeight
      }
    }
  }
}

/**
 * @description: 地址栏前进/后退时的处理
 * @return {*}
 */
window.addEventListener('popstate', async () => {
  preVisible.value = false
  const path = router.currentRoute.value.path
  if (path != '/') {
    pathList.value.pop()
    let res = await netFetch(baseUrl + '/view' + path)
    if (res.code == '200') {
      breadRender(path)
      initMenu()
      getPages(res)
      contents.value = res.data
    }
  }
  if (path == '/') {
    pathList.value = []
    initMenu()
    getMenu()
  }
})

/**
 * @description: 从服务器获取数据并渲染到页面
 * @param {*} path
 * @param {*} url
 * @return {*}
 */
const fetchDir = async (path: string, url: string, file: boolean = false) => {
  let target = file ? `${baseUrl}${path}${url}` : `${api}${path.replace(/(\?.*)/g, '/')}${url}`
  const res = await netFetch(target)

  if (res && res.code == '200') {
    await router.push(path + url)
    currentUrl.value = router.currentRoute.value.path
    initMenu()
    pathList.value = []
    getPages(res)
    contents.value = res.data
    let tmp = path + url
    tmp.split('/').forEach((item) => {
      if (item != '') {
        pathList.value.push('/' + item)
      }
    })
  } else {
    message.error({
      content: () => '目录未挂载嘞,有联系方式的来反馈',
      duration: 3
    })
  }
}
/**
 * @description: 获取分页信息
 * @param {*} res
 * @return {*}
 */
const getPages = (res: any) => {
  total.value = res.total
  count.value = res.count
  current.value = res.page
  pageSize.value = res.pageSize
}

/**
 * @description: 分页翻页逻辑
 * @param {*} page
 * @param {*} pageSize
 * @return {*}
 */
const turnPages = async (page: number, pageSize: number) => {
  const path = router.currentRoute.value.path
  let res = await netFetch(`${api}${path}?page=${page}&pageSize=${pageSize}`)
  if (res.code == '200') {
    initMenu()
    contents.value = res.data
    await router.push({
      path: path,
      query: { page: page, pageSize: pageSize }
    })
    console.log(res, 'res.data', '|', 'page', page, '|', pageSize)
    getPages(res)
  }
}
/**
 * @description: 渲染面包屑的逻辑
 * @param {*} id
 * @return {*}
 */
const breadRender = (id: number | string) => {
  let path: string = ''
  if (judgeType(id) == 'Number') {
    let i = id as number
    for (let index = 0; index <= i; index++) {
      path += pathList.value[index]
    }
    pathList.value = []
  }
  if (judgeType(id) == 'String') {
    pathList.value = []
    router.currentRoute.value.path.split('/').forEach((element) => {
      if (element != '') pathList.value.push('/' + decodeURI(element))
    })
    pathList.value.forEach((element: string) => {
      path += element
    })
  }
  pathList.value = []
  fetchDir('', path)
}
/**
 * @description: 面包屑返回主页的操作
 * @return {*}
 */
const goIndex = async () => {
  await router.push('/')
  pathList.value = []
  initMenu()
  await getMenu()
}

/**
 * @description: 分页数据的初始化
 * @return {*}
 */
const initPages = () => {
  pageSize.value = 1
  current.value = 1
  count.value = 1
  total.value = 1
}

/**
 * @description: 初始化全部数据
 * @return {*}
 */
const initMenu = () => {
  contents.value = []
  menu.value = []
}

/**
 * @description: 
 *  媒体数据的初始化
 *  清空所有媒体数据
 * @return {*}
 */
const initMedia = () => {
  mediaTitle.value = ''
  videoLink.value = ''
  picList.value = []
  videoList.value = []
  audioList.value = []
  audioLink.value = ''
  txtContent.value = []
  lrcTxts.value = []
}

//调用页面加载
getMenu()

/**
 * @description: 关闭视频并清空媒体数据
 * @return {*}
 */
const closeWindow = () => {
  preVisible.value = false
  videoLink.value && initMedia()
  let query = router.currentRoute.value.query.page ?
    { page: router.currentRoute.value.query.page, pageSize: router.currentRoute.value.query.pageSize } : {}
  router.replace({
    path: router.currentRoute.value.path,
    query: query
  })
}

//antd抽屉的打开
const showDrawer = () => {
  open.value = true
}

//打开预览媒体的浮窗
const showWindow = () => {
  preVisible.value = true

}

/**
 * @description: 在抽屉列表切换媒体的方法
 * @param {*} item
 * @param {*} mediaType
 * @param {*} id
 * @return {*}
 */
const switchMedia = (item: any, mediaType: string, id: number) => {
  let path = pathList.value.join('')
  mediaTitle.value = item.name.replace('/', '')
  if (mediaType == "video") {
    videoLink.value = baseUrl + path + item.name
  } else if (mediaType == "audio") {
    playIndex.value = id
    audio.value.src = item.link
    audio.value.play()
  }
}

/**
 * @description: 切换到下一个媒体的方法,用于播放结束时的自动切换
 * @param {*} mediaList
 * @param {*} mediaType
 * @param {*} let
 * @return {*}
 */
const playNextMedia = (mediaList: any, mediaType: string) => {
  if (playIndex.value < mediaList.length - 1) {
    playIndex.value++
    mediaTitle.value = mediaList[playIndex.value].name.replace('/', '')
    let path = pathList.value.join('')

    if (mediaType === 'audio') {
      audio.value.src = mediaList[playIndex.value].link
      audio.value.play()
      audio.value.onended = () => {
        playNextMedia(audioList.value, 'audio')
      }
    }
    router.push({
      path: path, query: {
        ...router.currentRoute.value.query,
        f: mediaList[playIndex.value].name
      },
    })
  }
}

/**
 * @description: 按钮暂停音乐的操作
 * @return {*}
 */
const changePlayState = () => {
  paused.value = !paused.value
  paused.value ? audio.value.pause() : audio.value.play()
}

/**
 * @description: 点击切换下一曲
 * @return {*}
 */
const playNext = () => {
  playNextMedia(audioList.value, 'audio')
}

/**
 * @description: 点击播放上一曲
 * @return {*}
 */
const playPrev = async () => {
  console.log("playIndex.value", playIndex.value);
  if (playIndex.value > 0) {
    let path = pathList.value.join('')
    playIndex.value--
    mediaTitle.value = audioList.value[playIndex.value].name.replace('/', '')
    audio.value.src = audioList.value[playIndex.value].link
    audio.value.play()
    router.push({
      path: path, query: {
        ...router.currentRoute.value.query,
        f: audioList.value[playIndex.value].name.replace('/', '')
      },
    })
  }
}

/**
 * @description: 对进度条更改时的操作
 * @param {*} e
 * @return {*}
 */
const setPlayTime = (e: any) => {
  audio.value.pause()
  let pWidth = DS('.progressBar')!.getBoundingClientRect()
  let pointPosition = ((e.clientX - pWidth.x) / pWidth.width) * 100
  if (pointPosition <= 100 && pointPosition > 0) {
    style.width = `${pointPosition}%`
    audio.value.currentTime = Number((audioDuration.value * pointPosition) / 100)
  }
}

const audioPlay = () => {
  audio.value.play()
}

/**
 * @description: 退出音乐播放
 * @return {*}
 */
const exitAudioPlay = () => {
  audio.value.pause()
  audioList.value = []
  audioLink.value = ''
  mediaTitle.value = ''
  preVisible.value = false
  audio.value = null
}
const clickLrcEvent = (time: number) => {
  audio.value.currentTime = time
}

/**
 * @description: 监听键盘操作,播放暂停,下一曲上一曲,快进倒退
 * @param {*} keypress
 * @param {*} e
 * @return {*}
 */
window.addEventListener('keypress', (e) => {
  if (audio.value) {
    switch (e.key) {
      case "p":
        playPrev()
        break
      case "n":
        playNext()
        break
      case " ":
        if (audio.value.paused) {
          audioPlay()
        } else {
          audio.value.pause()
        }
        break
      case 's':
        exitAudioPlay()
        break
      case '-':
        audio.value.currentTime = currentTime.value - 3
        break
      case '=':
        audio.value.currentTime = currentTime.value + 3
        break
      default:
        break
    }
  }

})
</script>
<template lang="pug">
a-float-button(
  v-if="audio"
  @click="showWindow"
  shape="circle"
  type="primary"
  :style="{ right: '64px'}")
  template(#icon)
    CustomerServiceOutlined

div.mask(v-if="preVisible")
  CloseCircleOutlined(@click="closeWindow")

  .container(v-if="contents")
    img.preImg(v-if='picList' v-for="(it,id) in picList" :key="id" :src="baseUrl+currentUrl+it.name")
    p.mediaTitle {{ mediaTitle }}
    .preVideo(v-if='videoLink')
      video(ref="video" controls preload="metadata" :src='videoLink')

    .preaudio(v-if='audioLink')
      .controllerBox
        .lyricBox
          p.lrcTxt(v-for="(item,idx) in lrcTxts" @click="clickLrcEvent(item.time)" :key='idx') {{ item.txt }}
        .playController
          CloseSquareOutlined(@click="exitAudioPlay")
          StepBackwardOutlined(@click="playPrev")
          PauseOutlined(v-if="!paused" @click='changePlayState')
          CaretRightOutlined(v-if="paused" @click='changePlayState')
          StepForwardOutlined(@click="playNext")
          UnorderedListOutlined(@click="showDrawer")
        .timeController
          span.timeLeft {{`${Math.floor(currentTime/60)}:${Math.ceil(currentTime%60)}`}}
          .progressBar(@mousedown='setPlayTime')
            .playbar(:style='style')
              img.timeDot(:src="playDot" @dragend="audioPlay" @drag="setPlayTime")
          span.timeRight {{`${Math.floor(audioDuration/60)}:${Math.ceil(audioDuration%60)}`}}
    .txtArea
      p.txtItem(v-for='(item,id) in txtContent' :key='id') {{ item }}      
    a-button(v-if="videoLink" type="primary" @click="showDrawer") 打开列表
    a-drawer(
    v-model:open="open"
    class="custom-class"
    root-class-name="root-class-name"
    style="color: red;background-color:var(--dark-bgc)"
    title="当前列表"
    placement="right"
    destroyOnClose=true)
      p.vListTitle(@click="switchMedia(item,'video',id)" style="font-size:14px;word-spacing:nowrap;text-overflow:ellipsis;overflow:hidden;margin:0;padding:6px 0 6px 0" v-if='videoLink' v-for="(item,id) in videoList"  :key="id") {{ item.name.replace('/','') }}
      p.vListTitle(@click="switchMedia(item,'audio',id)" style="font-size:14px;word-spacing:nowrap;text-overflow:ellipsis;overflow:hidden;margin:0;padding:6px 0 6px 0" v-if='audioLink'  v-for="(item,id) in audioList" :key="id") {{ item.name.replace('/','') }}
.fileContent
  a-breadcrumb(separator="")
    a-breadcrumb-item(style="font-size:16px" @click="goIndex") 主页
    a-breadcrumb-item(style="font-size:16px" @click="breadRender(index)" v-for="(item,index) in pathList"  :key="item.id") {{ item }}
  .folder
    .folderMain(v-if="menu" v-for="item in menu" :title="item" :key='item' @click="subRender(item)")
      folder-outlined(style='font-size:100px')
      p.folderTitle {{item}}
    .folderSub(v-if="contents" v-for="(item,index) in contents" :title="item.name" :key="item.name" @click="subRender(item,index)")
      .listContainer()
        FolderOutlined(v-if="item.type=='dir'" style='font-size:46px;')
        img(v-else-if="item.type=='picture'" style='width:46px;' :src="baseUrl+'/thumb'+currentUrl+item.name") 
        img(v-else-if="item.type=='video'" style='width:46px;' :src="baseUrl+'/thumb'+currentUrl+item.name") 
        SoundOutlined(v-else-if="item.type=='audio'" style='font-size:46px;')
        FileTextOutlined(v-else-if="item.type=='txt'" style='font-size:46px;')
        FileOutlined(v-else style='font-size:46px;')
        .textBox
          p.subTitle {{item.name}}  
          .detail
            span.modiTime {{ item.modiTime }}
            span.ext {{ item.ext }}
            span.FileSize(v-if="item.size") {{ item.size }}
  a-pagination(:pageSizeOptions=['50','100','200'] hideOnSinglePage=true v-model:pageSize="pageSize" v-model:current="current"  :total="total" @change="turnPages")
</template>

<style scoped>
.mask {
  z-index: 100;
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: #0006;

  .anticon-close-circle {
    font-size: 36px;
    position: absolute;
    right: 20px;
    top: 20px;
    z-index: 200;
    background-color: blueviolet;
    border-radius: 50%;
  }

  .container {
    overflow-y: auto;
    width: 96%;
    max-width: 1080px;
    height: 96%;
    background-color: var(--dark-bgc);
    position: relative;
    left: 50%;
    top: 50%;
    scroll-margin: 100px 0 100px 0;
    border-radius: 10px;
    transform: translate(-50%, -50%);

    .preImg {
      border-radius: 10px;
      width: 100%;
    }

    .preVideo {
      max-width: 100%;

      video {
        width: 100%;
      }
    }

    .txtItem {
      margin: 0 10px 0;
      font-size: 16px;
      line-height: 16px;
      padding: 2px 0 2px 0;
    }

    .preaudio {
      height: 90%;
      width: 100%;

      .controllerBox {
        position: relative;
        height: 100%;

        .lyricBox {
          display: flex;
          align-items: center;
          flex-direction: column;
          margin-top: 24px;
          height: 86%;
          width: 100%;
          overflow-y: auto;
          text-align: center;
          padding-top: calc(36vh);
          transition: all ease 0.5s;

          .lrcTxt {
            width: fit-content;
            margin: 0;
            line-height: 32px;
            font-size: 14px;
            box-sizing: border-box;
            min-height: 32px;
            flex-shrink: 0;
          }

          .active {
            transition: ease 0.5s;
            font-weight: bolder;
            font-size: 16px;
            color: rgb(255, 251, 0);
            line-height: 38px;
            min-height: 38px;
          }
        }

        .playController {
          position: absolute;
          bottom: 52px;
          left: 50%;
          transform: translateX(-50%);
          width: 50%;
          display: flex;
          justify-content: space-between;

          .anticon {
            font-size: 36px;
          }
        }

        .timeController {
          padding: 0 5% 0 5%;
          position: absolute;
          width: 90%;
          height: 32px;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);

          .timeLeft {
            float: left;
            line-height: 32px;
          }

          .progressBar {
            position: absolute;
            height: 6px;
            width: 70%;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background-color: grey;
            border-radius: 6px;

            .playbar {
              border-radius: 6px;
              position: relative;
              height: 100%;
              width: 0%;
              background-color: blueviolet;

              .timeDot {
                display: block;
                height: 20px;
                width: 20px;
                position: absolute;
                top: 50%;
                right: -20px;
                transform: translate(-50%, -50%);
              }
            }
          }

          .timeRight {
            float: right;
            line-height: 32px;
          }
        }
      }
    }

    .mediaTitle {
      text-align: center;
      width: 100%;
      word-spacing: nowrap;
      font-size: 16px;
      min-height: 52px;
      line-height: 52px;
      margin-bottom: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      margin-bottom: 10px;
    }
  }
}

.fileContent {
  position: relative;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 96%;
  height: 96%;
  overflow-y: auto;

  :deep(.ant-pagination-item-active) {
    background-color: var(--dark-active-bgc);
  }

  :deep(.ant-select-selector) {
    background-color: var(--dark-bgc);
  }

  :deep(.ant-select-dropdown) {
    background-color: var(--dark-bgc);
  }

  :deep(.ant-select-item-option-selected) {
    background-color: var(--dark-active-bgc);
    font-weight: 900;
  }

  .ant-pagination {
    text-align: center;
  }

  .folder {
    height: calc(96% - 50px);
    padding-bottom: 48px;
    margin: 10px 0 10px 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-content: start;
    justify-content: start;
    overflow-y: auto;

    .folderMain {
      height: 120px;
      width: 100px;
      float: left;
      margin: 10px;


      .folderTitle {
        font-size: 20px;
        padding: 6px 0 6px 0;
        margin-bottom: 0;
        text-align: center;
        line-height: 20px;
        width: 100%;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
    }

    .folderSub {
      margin-right: 20px;
      height: 50px;
      width: 50%;
      margin: 2px 0 2px 0;
      display: flex;
      flex-direction: row;

      .listContainer {
        height: 50px;
        display: flex;
        width: 96%;

        .textBox {
          height: 50px;
          width: calc(100% - 60px);
          margin-left: 10px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;

          .subTitle {
            display: inline-block;
            font-size: 16px;
            padding-bottom: 6px;
            margin-bottom: 0;
            width: 100%;
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
          }
        }

        .detail {
          font-size: 12px;
          margin-right: 10px;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
      }
    }
  }
}

@media screen and (max-width:960px) {
  .folder {
    .folderMain {
      .folderTitle {
        font-size: 16px !important;
        padding: 3px 0 3px 0 !important;
        line-height: 16px !important;
      }
    }

    .folderSub {
      height: 36px !important;
      width: 100% !important;

      .listContainer {
        max-height: 36px !important;

        .anticon {
          font-size: 36px !important;
        }

        img {
          width: 36px !important;
          height: 36px !important;
        }

        .textBox {
          height: 36px !important;
        }
      }
    }
  }
}
</style>
