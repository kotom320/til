---
title: "파일 업로드 진행바는 XHR 의 upload.onprogress 로 만든다 (fetch 에는 업로드 진행률이 없다)"
date: "2026-10-30"
tags: ["JavaScript", "XMLHttpRequest", "upload", "S3"]
summary: "xhr.upload.onprogress 로 업로드 진행률 표시하기"
---

## 배경 / 계기

어드민 화면에 계약서 파일(PDF, DOCX, 이미지, 최대 20MB)을 올리는 기능을 만들면서, 파일마다 진행바와 `1.2MB / 3.1MB` 같은 올라간 크기를 보여 줘야 했다.
프로젝트의 API 호출은 전부 `fetch` 기반 클라이언트였는데, `fetch` 로는 **업로드** 진행률을 받을 수 없었다. 그래서 업로드 한 번만 `XMLHttpRequest` 로 보냈다.

## 핵심 개념

### 1. 진행률은 브라우저가 알려 준다

브라우저는 요청 본문을 네트워크로 내보내면서 `XMLHttpRequest.upload` 객체에 `progress` 이벤트를 쏜다.

- `event.loaded`: 지금까지 보낸 바이트 수
- `event.total`: 보낼 전체 바이트 수
- `event.lengthComputable`: `total` 을 믿을 수 있는지 여부

`loaded / total` 이 곧 0~1 사이의 진행률이다. `File` 을 그대로 `send()` 하면 크기를 알고 있으므로 `lengthComputable` 이 `true` 가 된다.

주의할 점은 `xhr.onprogress` 와 `xhr.upload.onprogress` 가 다르다는 것이다.

| 이벤트 | 의미 |
|--------|------|
| `xhr.upload.onprogress` | 요청 본문을 **보내는** 진행률 (업로드) |
| `xhr.onprogress` | 응답 본문을 **받는** 진행률 (다운로드) |

### 2. fetch 에는 업로드 진행률 API 가 없다

`fetch` 는 응답 쪽은 `response.body` 스트림을 읽으며 다운로드 진행률을 직접 계산할 수 있지만, 요청 본문을 얼마나 보냈는지 알려 주는 이벤트는 없다.
요청 본문에 `ReadableStream` 을 넣는 streaming upload 도 있지만 `duplex: 'half'` 와 HTTP/2 이상이 필요하고, S3 presigned PUT 처럼 `Content-Length` 가 필요한 곳에는 맞지 않는다. 그래서 업로드 진행률이 필요하면 지금도 XHR(또는 XHR 을 감싼 axios 의 `onUploadProgress`)을 쓴다.

### 3. 전체 흐름: presigned URL 2단계 업로드

```
① 우리 서버에 "이 파일 올릴게요" (파일명, Content-Type, 크기) → 업로드 URL + 파일 ID 발급
② 발급받은 URL 로 파일을 S3 에 직접 PUT (XHR, 여기서 진행률 발생)
③ 폼 저장 시 파일 ID 만 서버로 보낸다 (저장 안 된 파일은 서버가 나중에 정리)
```

파일 본문이 우리 API 서버를 거치지 않으므로 서버 부하가 없고, 진행률도 실제 S3 로 나가는 바이트 기준이 된다.

## 예시 코드

### 진행률을 알리는 PUT

```ts
export class UploadAbortedError extends Error {
  constructor() {
    super('업로드를 취소했습니다.');
    this.name = 'UploadAbortedError';
  }
}

const putWithProgress = (
  url: string,
  file: File,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('PUT', url);
    // presigned URL 의 서명에 Content-Type 이 포함되어 있어 발급 때 보낸 값과 같아야 한다.
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('업로드 실패'));
    xhr.onerror = () => reject(new Error('업로드 실패'));
    xhr.onabort = () => reject(new UploadAbortedError());
    // XHR 은 AbortSignal 을 직접 받지 않으므로 이어 준다.
    signal.addEventListener('abort', () => xhr.abort(), { once: true });

    xhr.send(file);
  });
```

포인트:

- **Promise 로 감싼다.** 호출하는 쪽은 `fetch` 처럼 `await` 로 쓰고, 진행률만 콜백으로 받는다.
- **인증 헤더를 붙이지 않는다.** 대상이 우리 서버가 아니라 S3 이고, 인증은 URL 의 서명이 대신한다. 공용 API 클라이언트의 인터셉터를 타지 않게 생 XHR 을 쓰는 이유이기도 하다.
- **`Content-Type` 을 발급 요청 때와 똑같이** 보낸다. 다르면 S3 가 `SignatureDoesNotMatch` 로 403 을 준다.
- **취소는 별도 에러로 구분한다.** 사용자가 모달을 닫아 끊은 건 실패가 아니므로 에러 표시를 하지 않는다.

### 2단계를 묶은 업로드 함수

```ts
export const uploadFile = async (
  file: File,
  onProgress: (ratio: number) => void,
  signal: AbortSignal,
): Promise<string> => {
  // 확장자가 없으면 file.type 이 빈 문자열이라 서명이 맞지 않는다. 미리 막는다.
  if (!file.type) throw new Error('파일 형식을 확인할 수 없습니다.');

  const issued = await apiClient.POST('/files/upload-url', {
    body: { fileName: file.name, contentType: file.type, contentLength: file.size },
    signal,
  });
  if (!issued.data) throw new Error('업로드를 시작하지 못했습니다.');

  if (signal.aborted) throw new UploadAbortedError();
  await putWithProgress(issued.data.uploadUrl, file, onProgress, signal);

  return issued.data.fid;
};
```

### React 에서 파일별 진행 상태 관리

여러 파일을 동시에 올리므로 파일마다 `key`, `status`, `progress` 를 가진 목록 상태로 관리한다.

```tsx
type TNewFileItem = {
  key: string;
  file: File;
  status: 'uploading' | 'done' | 'failed';
  progress: number; // 0 ~ 1
  fid?: string;
  error?: string;
};

const [items, setItems] = useState<TNewFileItem[]>([]);
const uploadControllerRef = useRef<AbortController>();

// 컨트롤러를 effect 안에서 만들어야 StrictMode 의 mount → unmount → mount 에서도 새 컨트롤러가 살아 있다.
useEffect(() => {
  const controller = new AbortController();
  uploadControllerRef.current = controller;
  return () => controller.abort(); // 모달이 내려가면 진행 중인 업로드를 모두 끊는다
}, []);

const patchItem = (key: string, patch: Partial<TNewFileItem>) =>
  setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

const startUpload = (key: string, file: File) => {
  const signal = uploadControllerRef.current?.signal;
  if (!signal) return;

  uploadFile(file, (ratio) => patchItem(key, { progress: ratio }), signal)
    .then((fid) => patchItem(key, { status: 'done', progress: 1, fid }))
    .catch((error: unknown) => {
      if (error instanceof UploadAbortedError) return;
      patchItem(key, { status: 'failed', error: error instanceof Error ? error.message : '실패' });
    });
};
```

`setItems` 를 함수형 업데이트(`prev => ...`)로 써야 한다. 진행률 콜백은 비동기로 계속 들어오므로, 클로저에 잡힌 옛 `items` 로 덮어쓰면 다른 파일의 진행 상태가 날아간다.

### 진행바 렌더링

```tsx
<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
  <div
    className={clsx('h-full rounded-full', isFailed ? 'bg-red-500' : 'bg-emerald-500')}
    style={{ width: `${isFailed ? 100 : Math.round(progress * 100)}%` }}
  />
</div>
<span>{formatSize(Math.round(file.size * progress))} / {formatSize(file.size)}</span>
```

진행률이 비율(0~1)이므로 막대 너비는 `progress * 100`%, 올라간 크기는 `file.size * progress` 로 같은 값에서 둘 다 계산된다.

## 왜 이 방법인가

| 방법 | 업로드 진행률 | 비고 |
|------|---------------|------|
| `fetch` | 없음 | 응답(다운로드) 진행률만 직접 계산 가능 |
| `fetch` + `ReadableStream` 본문 | 직접 계산 가능 | `duplex: 'half'`, HTTP/2 필요, S3 presigned PUT 에 부적합 |
| `XMLHttpRequest` | `xhr.upload.onprogress` | 브라우저 기본 지원, 의존성 없음 |
| axios `onUploadProgress` | 있음 | 내부적으로 XHR. 업로드 하나 때문에 의존성을 들이기엔 과함 |

이미 `fetch` 기반 클라이언트가 있는 프로젝트라 axios 를 새로 들이지 않고, 업로드 PUT 한 군데만 XHR 을 Promise 로 감싸 썼다. presigned URL 방식이라 인증 인터셉터가 필요 없다는 점도 생 XHR 이 오히려 맞는 이유였다.

## 정리

업로드 진행바는 `xhr.upload.onprogress` 의 `loaded / total` 로 만든다. `fetch` 에는 업로드 진행률이 없으니 XHR 을 Promise + AbortSignal 로 감싸 쓰고, 상태는 파일별 함수형 업데이트로 갱신한다.
