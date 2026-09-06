import "./App.css";
import { UseActionStateDemo } from "./Components/Hooks/useActionState";
import { UseCallbackDemo } from "./Components/Hooks/useCallback";
import { UseContextDemo } from "./Components/Hooks/useContext";
import { UseDebounceDemo } from "./Components/Hooks/useDebounce";
import { UseDebugValueDemo } from "./Components/Hooks/useDebugValue";
import { UseDeferredValueDemo } from "./Components/Hooks/useDeferredValue";
import { UseDemo } from "./Components/Hooks/use";
import { UseEffectDemo } from "./Components/Hooks/useEffect";
import { UseEventListenerDemo } from "./Components/Hooks/useEventListener";
import { UseFetchDemo } from "./Components/Hooks/useFetch";
import { UseIdDemo } from "./Components/Hooks/useId";
import { UseImperativeHandleDemo } from "./Components/Hooks/useImperativeHandle";
import { UseIntersectionObserverDemo } from "./Components/Hooks/useIntersectionObserver";
import { UseLayoutEffectDemo } from "./Components/Hooks/useLayoutEffect";
import { UseLazyLoadOnScreenViewDemo } from "./Components/Hooks/useLazyLoadOnScreenView";
import { UseLocalStorageDemo } from "./Components/Hooks/useLocalStorage";
import { UseMemoDemo } from "./Components/Hooks/useMemo";
import { UseOnClickOutsideDemo } from "./Components/Hooks/useOnClickOutside";
import { UseOptimisticDemo } from "./Components/Hooks/useOptimistic";
import { UsePreviousDemo } from "./Components/Hooks/usePrevious";
import { UseReducerDemo } from "./Components/Hooks/useReducer";
import { UseRefDemo } from "./Components/Hooks/useRef";
import { UseStateDemo } from "./Components/Hooks/useState";
import { UseSyncExternalStoreDemo } from "./Components/Hooks/useSyncExternalStore";
import { UseThrottleDemo } from "./Components/Hooks/useThrottle";
import { UseTransitionDemo } from "./Components/Hooks/useTransition";
import { UseWindowSizeDemo } from "./Components/Hooks/useWindowSize";

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
      <hr />
      <UseIdDemo />
      <hr />
      <UseSyncExternalStoreDemo />
      <hr />
      <UseImperativeHandleDemo />
      <hr />
      <UseDemo />
      <hr />
      <UseActionStateDemo />
      <hr />
      <UseOptimisticDemo />
      <hr />
      <UseDebugValueDemo />
      <hr />
      <UseDebounceDemo />
      <hr />
      <UseThrottleDemo />
      <hr />
      <UsePreviousDemo />
      <hr />
      <UseOnClickOutsideDemo />
      <hr />
      <UseLocalStorageDemo />
      <hr />
      <UseFetchDemo />
      <hr />
      <UseWindowSizeDemo />
      <hr />
      <UseIntersectionObserverDemo />
      <hr />
      <UseEventListenerDemo />
      <hr />
      <UseLazyLoadOnScreenViewDemo />
    </div>
  );
}

export default App;
