// Copyright 2018 Knowledge Expert SA
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//     You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
//     Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
//     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//     See the License for the specific language governing permissions and
// limitations under the License.

import {browser} from 'protractor';
import {Wait} from './wait';
import * as mergeImg from 'merge-img';
import * as Jimp from 'jimp';
import {WebElement} from 'selenium-webdriver';


export namespace Screenshot {
    /**
     * The method allows to take full page screenshots by scrolling screen and merging taken parts of screen
     * (without scrollbars) into one whole screenshot.
     * If there are frames, the method will automatically switch to default content to avoid breaking flow.
     * @returns {Promise<Buffer>}
     */
    export async function take(): Promise<Buffer> {
        const screens = [];

        // if in frame, need to swith to default content to make an screenshot
        const currentFrameElement = await getCurrentFrameWebElement();
        if (currentFrameElement !== null) {
            await browser.switchTo().defaultContent();
        }

        await hideScrollbars();
        const browserData = await getBrowserData();
        const screensCount = Math.ceil(browserData.pageHeight / browserData.innerHeight);
        const delta = (browserData.innerHeight * screensCount) - browserData.pageHeight;

        for (let i = 0; i < screensCount; i++) {
            await scrollToNthScreen(browserData, i);
            const screen = await takeScreenshotWithWait();

            if (screensCount > 1 && (i + 1) === screensCount && delta > 0) {
                // console.log(`last screenshot contains a part fo previous screenshot, delta:${delta}, height:${browserData.innerHeight}`);
                const croppedScreen = await crop(screen, delta);
                screens.push(croppedScreen);
                // console.log(`Screenshot ${i} is cropped and taken`);
            } else {
                screens.push(screen);
                // console.log(`Screenshot ${i} is taken`);
            }
        }

        // if was in frame, need to switch it again to avoid breaking flow
        if (currentFrameElement !== null) {
            await browser.switchTo().frame(await currentFrameElement);
        }

        return await mergeImg(screens, {direction: true})
            .then(mergedScreenshot => {
                // console.log(`Screenshots is merged`);
                const result = getBuffer(mergedScreenshot);
                // console.log(`Whole page screenshot buffer is prepared`);
                return result;
            }, error => console.log(error));
    }

    async function getCurrentFrameWebElement(): Promise<WebElement> {
        return (await browser.executeScript(`return window.frameElement`)) as WebElement;
    }

    async function hideScrollbars() {
        await setDocumentOverflow();
    }

    // async function disableFixedElements() { // TODO can be used to avoid fixed elements appearing multiple times on fullpage screenshots (f.e. when footer is sticed to the top)
    //     const JS_GET_IS_BODY_OVERFLOW_HIDDEN = `
    //         return (function () {
    //             var styles = window.getComputedStyle(document.body, null);
    //             var overflow = styles.getPropertyValue('overflow');
    //             var overflowX = styles.getPropertyValue('overflow-x');
    //             var overflowY = styles.getPropertyValue('overflow-y');
    //             return overflow == 'hidden' || overflowX == 'hidden' || overflowY == 'hidden';
    //             })();`;
    //     const isBodyOverflowisHidden = Boolean(await browser.executeScript(JS_GET_IS_BODY_OVERFLOW_HIDDEN));
    //     if (isBodyOverflowisHidden) {
    //         await setBodyOverflow();
    //     }
    // }

    async function setDocumentOverflow(overflowValue = 'hidden'): Promise<string> {
        return setOverflow('document.documentElement.style.overflow', overflowValue);
    }

    async function setBodyOverflow(overflowValue = 'initial'): Promise<string> {
        return setOverflow('document.body.style.overflow', overflowValue);
    }

    async function setOverflow(element: string, overflowValue: string): Promise<string> {
        return String(await browser.executeScript(`
            return (function () {
                var origOverflow = ${element};
                ${element} = ${overflowValue ? `'${overflowValue}'` : 'undefined'};
                return origOverflow;
                })();
        `));
    }

    async function getBrowserData(): Promise<BrowserData> {
        const windowData = await browser.executeScript(`
        return {
                devicePixelRatio: window.devicePixelRatio,
                width: window.screen.height * window.devicePixelRatio,
                height: window.screen.height * window.devicePixelRatio,
                innerHeight: window.innerHeight * window.devicePixelRatio,
                pageWidth: document.body.scrollWidth * window.devicePixelRatio,
                pageHeight: document.body.scrollHeight * window.devicePixelRatio
        };`);
        // console.log(`Browser window data: ${JSON.stringify(windowData)}`);
        return windowData as BrowserData;
    }

    async function scrollToNthScreen(browserData, index: number) {
        await browser.executeScript(`window.scrollTo(0, + ${(browserData.innerHeight / browserData.devicePixelRatio) * index});`);
    }

    async function takeScreenshotWithWait(): Promise<Buffer> {
        await Wait.hard(100);
        return new Buffer(await browser.takeScreenshot(), 'base64')
    }

    async function crop(screenBuffer: Buffer, delta: number): Promise<Buffer> {
        return Jimp.read(screenBuffer).then(img => {
            const width = img.bitmap.width;
            const height = img.bitmap.height;
            const croppedImg = img.clone().crop(0, delta, width, height);
            return getBuffer(croppedImg);
        });
    }

    async function getBuffer(jimpImage): Promise<Buffer> {
        return await new Promise<Buffer>((resolve, reject) => {
            jimpImage.getBuffer(Jimp.AUTO, (err, buff) => {
                if (err) reject(err);
                resolve(buff)
            });
        });
    }

    type BrowserData = {
        devicePixelRatio: number,
        width: number,
        height: number,
        innerHeight: number,
        pageWidth: number,
        pageHeight: number
    };

}
