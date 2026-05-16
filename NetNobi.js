// ==UserScript==
// @name         小网神NetNobi
// @namespace    http://tampermonkey.net/
// @version      2605.0
// @description
// @author       xxfad
// @match        https://v.qq.com/x/cover/*
// @match        https://v.qq.com/x/page/*
// @match        https://www.bilibili.com/video/*
// @icon         https://v.qq.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/xxfad/netnobi/main/NetNobi.js
// @downloadURL  https://raw.githubusercontent.com/xxfad/netnobi/main/NetNobi.js
// ==/UserScript==

(function() {
    'use strict';

    // Your code here...
    const GUARD_PREFIX = "NetNobi：";
    const AGE_LEVEL = 12;
    const OPENAI_BASE_URL = "https://api.siliconflow.cn/v1";
    const OPENAI_MODEL = "deepseek-ai/DeepSeek-V4-Flash";

    // 注册菜单命令，用于设置密钥
    GM_registerMenuCommand("设置 OEPNAI_API_KEY", () => {
        const key = prompt(GUARD_PREFIX + "请输入你的 OEPNAI_API_KEY：");
        if (key) {
            GM_setValue("sk", key);
        }
    });

    GM_registerMenuCommand("设置 OPENAI_BASE_URL", () => {
        const currentApi = GM_getValue("OPENAI_BASE_URL", GM_getValue("ai_api", OPENAI_BASE_URL));
        const baseUrl = prompt(GUARD_PREFIX + "请输入 OPENAI_BASE_URL：", currentApi);
        if (baseUrl) {
            GM_setValue("OPENAI_BASE_URL", baseUrl);
        }
    });

    GM_registerMenuCommand("设置 OPENAI_MODEL", () => {
        const currentModel = GM_getValue("OPENAI_MODEL", OPENAI_MODEL);
        const model = prompt(GUARD_PREFIX + "请输入 OPENAI_MODEL：", currentModel);
        if (model) {
            GM_setValue("OPENAI_MODEL", model);
        }
    });


function GetVideoInfo() {

    if (location.hostname.includes("v.qq.com")) {
        return (document.querySelector('[name=description]') || document.querySelector('[name=keywords]')).content;
    } else if (location.hostname.includes("bilibili.com")) {
        return document.querySelector('.video-info-title-inner').textContent + ' ' + document.querySelector('.video-tag-container').textContent
    } else {
        throw new Error("还未支持：" + location.hostname);
    }
}

function NetNobi() {

    console.log(GUARD_PREFIX + "开始检测该视频是否适合小朋友观看");

    // 获取视频简介
    let videoInfo = GetVideoInfo();

    if (videoInfo.length < 9) {
        console.log(GUARD_PREFIX + `《${videoInfo}》信息太少，不足以判断，视为不适合`)
        // 提示“不合适小朋友观看”
        document.body.innerHTML = '<h1 style="font-size:3rem;">' + GUARD_PREFIX + '该视频不合适小朋友观看,3秒后关闭页面</h1>';
        //进行3秒倒计时，然后关闭页面
        setTimeout(() => { window.close() || window.history.back() }, 3000);

        return;
    }

    // 组装问答
    let question = `《${videoInfo}》适合${AGE_LEVEL}岁小朋友看吗？回答适合或者不适合`;

    console.log(GUARD_PREFIX + question);

    // 获取密钥并使用
    const sk = GM_getValue("sk", null);
    if (!sk) {
        alert(GUARD_PREFIX + "尚未设置 OpenAI 密钥，请通过菜单设置");
        //window.close() || window.history.back() ;
    }

    const openaiModel = GM_getValue("OPENAI_MODEL", OPENAI_MODEL);
    const agentOptions = {
        "model": openaiModel,
        "max_tokens": 64,
        "min_p": 0.05,
        "temperature": 0.7,
        "top_p": 0.7,
        "top_k": 50,
        "frequency_penalty": 0.5,
        "n": 1,
        "stream": false,
        "messages": [
            {
                "role": "system",
                "content": "你是专业的视频内容鉴别专家，专注守护儿童身心健康。允许:积极向上、少儿动画、少儿节目、少儿电影、角色对抗、手工、生活赶海、美食测评、生活旅游、生活捕猎、学习、解谜、科学、科技、益智、童话故事等等。不允许:哈小浪、口水剧、非电视剧类的原创动画、穿越重生等等",
            },
            {
                 "role": "user",
                "content": `${question}`

            }
        ]
    };

    // fetch请求openai
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${sk}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(agentOptions)
    };

    //debugger

    const openaiBaseUrl = GM_getValue("OPENAI_BASE_URL", GM_getValue("ai_api", OPENAI_BASE_URL));
    const normalizedBaseUrl = openaiBaseUrl.replace(/\/+$/, "");
    const chatCompletionsUrl = normalizedBaseUrl.endsWith("/chat/completions")
        ? normalizedBaseUrl
        : `${normalizedBaseUrl}/chat/completions`;
    fetch(chatCompletionsUrl, options)
        .then(response => response.json())
        .then(data => {
            console.log(GUARD_PREFIX + data.choices[0].message.content)
            // 如果信息中包含“不适合”，则提示“不合适小朋友观看”
            if (data.choices[0].message.content.includes("不适合")) {
                // 提示“不合适小朋友观看”
                document.body.innerHTML = '<h1 style="font-size:3rem;">' + GUARD_PREFIX + '该视频不合适小朋友观看,3秒后关闭页面</h1>';
                //进行3秒倒计时，然后关闭页面
                setTimeout(() => { window.close() || window.history.back() }, 3000);
            }

        })
        .catch(err => {
            console.error(GUARD_PREFIX + err);
            // fallback
            // 提示“不合适小朋友观看”
            document.body.innerHTML = '<h1 style="font-size:3rem;">' + GUARD_PREFIX + '该视频不合适小朋友观看,3秒后关闭页面</h1>';
            //进行3秒倒计时，然后关闭页面
            setTimeout(() => { window.close() || window.history.back() }, 3000);
        });
}

setTimeout( () => NetNobi(), 500);
setTimeout( () => NetNobi(), 10000);

function listenToUrlChanges(callback) {
  window.addEventListener('popstate', () => callback('popstate'));

  ['pushState', 'replaceState'].forEach(type => {
    const original = history[type];
    history[type] = function (...args) {
      const result = original.apply(this, args);
      callback(type);
      return result;
    };
  });
}


listenToUrlChanges(() => {
 setTimeout( () => NetNobi(), 500);
 setTimeout( () => NetNobi(), 10000);
});

})();
