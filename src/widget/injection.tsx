import {createRoot} from "react-dom/client";
import {StrictMode} from "react";
import Bot from "./Bot.tsx";

(function () {
    const bot = document.createElement('div')
    bot.id = 'bot';
    document.body.appendChild(bot)
    const root = bot.attachShadow({mode: 'open'});
    createRoot(root).render(
        <StrictMode>
            <Bot/>
        </StrictMode>,
    )
})();
