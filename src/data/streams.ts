// Единое место для всех трансляций.
// Пока ссылок нет, страницы показывают заглушку вместо плеера.
//
// kind: 'iframe' — встраиваемый плеер (YouTube, RTSP.me, любой сервис с embed-ссылкой)
// kind: 'hls'    — прямая ссылка на поток .m3u8

export type Stream = {
  id: string;
  title: string;
  place: string;
  kind: 'iframe' | 'hls';
  src: string; // пусто — плеер не показывается
  note?: string;
};

/** Камеры в классе детской радиошколы. */
export const cameras: Stream[] = [
  {
    id: 'class-general',
    title: 'Класс, общий план',
    place: 'Радиошкола',
    kind: 'iframe',
    src: '',
    note: 'Обзорная камера на класс.',
  },
  {
    id: 'operator-desk',
    title: 'Рабочее место оператора',
    place: 'Радиошкола',
    kind: 'iframe',
    src: '',
    note: 'Камера на трансивер и органы управления.',
  },
];

/** Трансляция экрана монитора или отдельных программ. */
export const screenBroadcast: Stream = {
  id: 'screen',
  title: 'Экран рабочего места',
  place: 'Шек R9OOF',
  kind: 'iframe',
  src: '',
  note: 'Панорама водопада, аппаратный журнал, программа управления трансивером.',
};
