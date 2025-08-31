import { useBotState, useDispatch } from "./BotStateContext.ts";

function Bot() {
  const enabled = useBotState(s => s.enabled);
  const dispatch = useDispatch();

  return (
    <button className="bot"
            onClick={() => dispatch({ type: 'buttonClicked' })}>
      AutoClick {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

export default Bot
