---

title: "React에서 Chart.js 파이 차트 만들기"
date: "2025-06-01"
tags: ["React", "Chart.js", "react-chartjs-2", "TypeScript"]
summary: "React 애플리케이션에서 Chart.js와 react-chartjs-2를 사용하여 파이 차트를 구현하는 과정을 정리합니다."
--------------------------------------------------------------------------------

## 배경

* 기존 백오피스 프로젝트에는 차트로 한눈에 데이터를 보여주는 표가 존재하지 않음.
* 투표 페이지를 만들면서 결과를 보여주는 그래프가 있으면 좋겠다고 생각.
* Chart.js는 인기 있는 오픈소스 차트 라이브러리이고, react-chartjs-2는 React와 쉽게 연동할 수 있게 해주는 래퍼 라이브러리임
* 이번에는 React 컴포넌트 형태로 Chart.js 파이 차트를 구현해 보고, TypeScript 환경에서 타입 안정성을 확보하는 방법을 배움

## 배운 내용

1. **라이브러리 설치**

   ```bash
   npm install chart.js react-chartjs-2
   # 또는
   yarn add chart.js react-chartjs-2
   ```

   * `chart.js`는 차트 렌더링 엔진
   * `react-chartjs-2`는 React에서 `<Pie>` 컴포넌트를 사용할 수 있게 해주는 래퍼

2. **Chart.js v3 이상에서의 모듈 등록**

   ```ts
   import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
   ChartJS.register(ArcElement, Tooltip, Legend);
   ```

   * Chart.js v3부터는 필요한 구성 요소와 플러그인을 명시적으로 등록해야 함
   * `ArcElement`는 파이/도넛 차트에 필요한 원형 요소, `Tooltip`과 `Legend`는 각각 툴팁과 범례 기능 제공

3. **파이 차트 컴포넌트 구현 (PieChart.tsx)**

   * `labels`과 `dataValues`를 props로 받아 데이터와 옵션을 설정
   * TypeScript 인터페이스로 prop 타입 정의

   ```tsx
   // PieChart.tsx
   import React from "react";
   import {
     Chart as ChartJS,
     ArcElement,
     Tooltip,
     Legend,
     ChartOptions,
   } from "chart.js";
   import { Pie } from "react-chartjs-2";

   // Chart.js 모듈 등록
   ChartJS.register(ArcElement, Tooltip, Legend);

   interface PieChartProps {
     labels: string[];
     dataValues: number[];
   }

   const PieChart: React.FC<PieChartProps> = ({ labels, dataValues }) => {
     // 데이터 객체 생성
     const data = {
       labels: labels,
       datasets: [
         {
           label: "Dataset",
           data: dataValues,
           backgroundColor: [
             "rgba(255, 99, 132, 0.7)",
             "rgba(54, 162, 235, 0.7)",
             "rgba(255, 206, 86, 0.7)",
             "rgba(75, 192, 192, 0.7)",
             "rgba(153, 102, 255, 0.7)",
           ],
           borderColor: [
             "rgba(255, 99, 132, 1)",
             "rgba(54, 162, 235, 1)",
             "rgba(255, 206, 86, 1)",
             "rgba(75, 192, 192, 1)",
             "rgba(153, 102, 255, 1)",
           ],
           borderWidth: 1,
         },
       ],
     };

     // 옵션 객체 생성 (툴팁에 퍼센트 표시)
     const options: ChartOptions<"pie"> = {
       responsive: true,
       plugins: {
         legend: {
           position: "bottom",
           labels: {
             font: {
               size: 14,
             },
           },
         },
         tooltip: {
           callbacks: {
             label: (tooltipItem) => {
               const value = tooltipItem.raw as number;
               const sum = (tooltipItem.dataset.data as number[]).reduce(
                 (acc, cur) => acc + cur,
                 0
               );
               const percent = ((value / sum) * 100).toFixed(1) + "%";
               return `${tooltipItem.label}: ${value} (${percent})`;
             },
           },
         },
       },
     };

     return <Pie data={data} options={options} />;
   };

   export default PieChart;
   ```

4. **컴포넌트 사용 예 (App.tsx)**

   ```tsx
   // App.tsx
   import React from "react";
   import PieChart from "./PieChart";

   function App() {
     const labels = ["JavaScript", "TypeScript", "React", "Vue", "Angular"];
     const values = [40, 25, 20, 10, 5];

     return (
       <div style={{ maxWidth: 600, margin: "50px auto" }}>
         <h2>기술 스택 선호도</h2>
         <PieChart labels={labels} dataValues={values} />
       </div>
     );
   }

   export default App;
   ```

   * `labels`와 `values`를 원하는 데이터로 바꾸면, 파이 차트가 자동으로 업데이트됨

5. **동적 데이터 변경**

   * React의 `useState`와 `useEffect`로 데이터를 관리하면, 외부 API 호출 결과나 사용자 입력에 따라 차트를 실시간으로 갱신할 수 있음
   * 예:

     ```tsx
     const [dataValues, setDataValues] = useState<number[]>([40, 25, 20, 10, 5]);

     useEffect(() => {
       fetch("/api/chart-data")
         .then((res) => res.json())
         .then((json) => {
           setDataValues(json.values);
         });
     }, []);
     ```

6. **반응형 디자인 및 스타일링**

   * `responsive: true` 설정으로 부모 컨테이너 크기에 맞춰 자동 리사이징
   * CSS를 이용해 `<div>` 레이아웃을 조절하거나, `height`/`width` 속성을 옵션에서 직접 설정 가능

## 코드 예제

```tsx
// PieChart.tsx
import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  labels: string[];
  dataValues: number[];
}

const PieChart: React.FC<PieChartProps> = ({ labels, dataValues }) => {
  const data = {
    labels: labels,
    datasets: [
      {
        label: "Dataset",
        data: dataValues,
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
          "rgba(153, 102, 255, 0.7)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: {
            size: 14,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw as number;
            const sum = (tooltipItem.dataset.data as number[]).reduce(
              (acc, cur) => acc + cur,
              0
            );
            const percent = ((value / sum) * 100).toFixed(1) + "%";
            return `${tooltipItem.label}: ${value} (${percent})`;
          },
        },
      },
    },
  };

  return <Pie data={data} options={options} />;
};

export default PieChart;
```

```tsx
// App.tsx
import React from "react";
import PieChart from "./PieChart";

function App() {
  const labels = ["JavaScript", "TypeScript", "React", "Vue", "Angular"];
  const values = [40, 25, 20, 10, 5];

  return (
    <div style={{ maxWidth: 600, margin: "50px auto" }}>
      <h2>기술 스택 선호도</h2>
      <PieChart labels={labels} dataValues={values} />
    </div>
  );
}

export default App;
```

![투표 결과 파이 차트 예시](/images/chartjs-example.png)


## 느낀 점

* React 컴포넌트 형태로 Chart.js를 사용하니, 재사용성과 유지보수 측면에서 유리함
* TypeScript 환경에서 제네릭(`ChartOptions<"pie">`)을 활용해 옵션 타입을 명확히 지정하니, 오타나 설정 오류를 사전에 예방할 수 있었음
* 툴팁 커스터마이즈를 통해 퍼센트 값을 계산해 보여주니, 사용자 경험이 더 좋아짐


---
