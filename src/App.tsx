import "./App.css";
import { UseCallbackDemo } from "./Components/Hooks/useCallback";
import { UseContextDemo } from "./Components/Hooks/useContext";
import { UseDeferredValueDemo } from "./Components/Hooks/useDeferredValue";
import { UseEffectDemo } from "./Components/Hooks/useEffect";
import { UseLayoutEffectDemo } from "./Components/Hooks/useLayoutEffect";
import { UseMemoDemo } from "./Components/Hooks/useMemo";
import { UseReducerDemo } from "./Components/Hooks/useReducer";
import { UseRefDemo } from "./Components/Hooks/useRef";
import { UseStateDemo } from "./Components/Hooks/useState";
import { UseTransitionDemo } from "./Components/Hooks/useTransition";

function App() {
  return (
    <div>
      <h1>Machine coding round questions on react</h1>
      <UseMemoDemo />
      <hr />
      <UseCallbackDemo />
      <hr />
      <UseStateDemo />
      <hr />
      <UseEffectDemo />
      <hr />
      <UseLayoutEffectDemo />
      <hr />
      <UseRefDemo />
      <hr />
      <UseReducerDemo />
      <hr />
      <UseContextDemo />
      <hr />
      <UseTransitionDemo />
      <hr />
      <UseDeferredValueDemo />
    </div>
  );
}

export default App;
