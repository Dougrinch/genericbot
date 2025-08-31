import { useState } from "react";

function Bot() {
  const [enabled, setEnabled] = useState(false);

  return (
    <button className="bot"
            onClick={() => setEnabled(prevState => !prevState)}>
      AutoClick {enabled ? 'ON' : 'OFF'}
    </button>
  )
}

export default Bot
