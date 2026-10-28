import { describe, it, expect } from "vitest";
import { IAntiCheatingConfig, IIntegrityEvent } from "@/types";

describe("Anti-Cheating Integrity Engine", () => {
  const config: IAntiCheatingConfig = {
    enabled: true,
    maxViolations: 3,
    actionOnThreshold: "auto_submit",
    blockCopyPaste: true,
    enforceFullscreen: true,
    detectTabSwitch: true,
    preventContextMenu: true,
  };

  it("accumulates violation events and flags auto-submission when maxViolations is reached", () => {
    let violationCount = 0;
    const integrityLog: IIntegrityEvent[] = [];

    function recordEvent(type: any, details?: string) {
      integrityLog.push({
        timestamp: new Date().toISOString(),
        type,
        details,
      });
      violationCount++;
      const shouldAutoSubmit = config.enabled && violationCount >= config.maxViolations;
      return { violationCount, shouldAutoSubmit };
    }

    // 1st warning: Tab switch
    const ev1 = recordEvent("tab_switch", "User switched away from exam window.");
    expect(ev1.violationCount).toBe(1);
    expect(ev1.shouldAutoSubmit).toBe(false);

    // 2nd warning: Fullscreen exit
    const ev2 = recordEvent("fullscreen_exit", "Student exited fullscreen mode.");
    expect(ev2.violationCount).toBe(2);
    expect(ev2.shouldAutoSubmit).toBe(false);

    // 3rd warning: Copy-paste attempt (threshold reached!)
    const ev3 = recordEvent("copy_paste_attempt", "Blocked clipboard copy event on question prompt.");
    expect(ev3.violationCount).toBe(3);
    expect(ev3.shouldAutoSubmit).toBe(true);

    expect(integrityLog.length).toBe(3);
    expect(integrityLog[0].type).toBe("tab_switch");
    expect(integrityLog[2].type).toBe("copy_paste_attempt");
  });
});
