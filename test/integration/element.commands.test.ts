// Copyright 2018 Knowledge Expert SA
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { browser, GIVEN, data, WHEN, driver, webelements } from './base';
import { be } from '../../lib';

/* short reminder of test helpers, that are not part of SelenideJs API;)
 * driver = common well known Selenium WebDriver
 * webelement('selector') = driver.findElement(By.css('selector'))
 */

describe('Element.* commands', () => {

    it('clicks on element once it is present in DOM and visible', async () => {
        await GIVEN.openedEmptyPageWithBodyAfter(data.timeouts.smallest, `
                <a href='#second' style='display:none'>go to Heading 2</a>
                <h2 id='second'>Heading 2</h2>
        `);
        await GIVEN.executeScriptWithTimeout(
            'document.getElementsByTagName("a")[0].style = "display:block";',
            data.timeouts.smallerThanDefault
        );

        await browser.element('a').click();
        expect(await driver.getCurrentUrl()).toContain('second');
    });

    fit('fails to click with error on not present in DOM element (after timeout)', async () => {
        await GIVEN.openedEmptyPageWithBodyAfter(data.timeouts.biggerThanDefault, `
                <a href='#second' style='display:none'>go to Heading 2</a>
                <h2 id='second'>Heading 2</h2>
        `);

        await browser.element('a').click()
            .then(ifNoError => fail('should fail on timeout'))
            .catch(async error => {
                expect(await driver.getCurrentUrl()).not.toContain('second');
                expect(error.message).toContain(`
\tTimed out after ${data.timeouts.byDefault}ms, while waiting for:
\tbrowser.element(By(css selector, a)).click
Reason:
\tno such element: Unable to locate element: {"method":"css selector","selector":"a"}`
                );
            });
    });

    fit('fails to click with error on not visible element (after timeout)', async () => {
        await GIVEN.openedEmptyPageWithBodyAfter(data.timeouts.smallerThanDefault, `
                <a href='#second' style='display:none'>go to Heading 2</a>
                <h2 id='second'>Heading 2</h2>
        `);

        await browser.element('a').click()
            .then(ifNoError => fail('should fail on timeout'))
            .catch(async error => {
                expect(await driver.getCurrentUrl()).not.toContain('second');
                expect(error.message).toContain(`
\tTimed out after ${data.timeouts.byDefault}ms, while waiting for:
\tbrowser.element(By(css selector, a)).click
Reason:
\telement not interactable`
                );
            });
    });

});
