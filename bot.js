(function() {
  const AUTOTEST = typeof window !== 'undefined' && window.__AUTOTEST__ === true;
  const WIDGET_ID = "__autoClickXPathWidget__";
  const LS_CONF   = "autoclick.xpathEntries.config.v3";
  const LS_VARS   = "autoclick.variables.config.v1";
  const LS_HOT    = "autoclick.hotReload.activeIds.v1";
  const MAX_Z     = 2147483647;

  class StorageManager {
    constructor() {
      this.LS_CONF = LS_CONF;
      this.LS_VARS = LS_VARS;
      this.LS_HOT = LS_HOT;
    }

    saveConfig(config) {
      localStorage.setItem(this.LS_CONF, JSON.stringify(config));
    }

    loadConfig() {
      try {
        return JSON.parse(localStorage.getItem(this.LS_CONF));
      } catch {
        return null;
      }
    }

    saveVariables(variables) {
      localStorage.setItem(this.LS_VARS, JSON.stringify(variables));
    }

    loadVariables() {
      try {
        return JSON.parse(localStorage.getItem(this.LS_VARS));
      } catch {
        return null;
      }
    }

    saveHotReloadState(activeIds) {
      try {
        localStorage.setItem(this.LS_HOT, JSON.stringify({ activeIds, at: Date.now() }));
      } catch(_) {}
    }

    loadHotReloadState() {
      try {
        const raw = localStorage.getItem(this.LS_HOT);
        if (raw) {
          return JSON.parse(raw);
        }
      } catch(_) {}
      return null;
    }

    clearHotReloadState() {
      try {
        localStorage.removeItem(this.LS_HOT);
      } catch(_) {}
    }
  }

  class XPathEvaluator {
    evalXPathMulti(xpath) {
      if (!xpath || !xpath.trim()) return { ok:false, nodes:[], count:0, error:null };
      try {
        const res = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const nodes = [];
        for (let i = 0; i < res.snapshotLength; i++) {
          const n = res.snapshotItem(i);
          if (n instanceof Element) nodes.push(n);
        }
        return { ok:true, nodes, count:nodes.length, error:null };
      } catch (e) {
        return { ok:false, nodes:[], count:0, error:String(e?.message || e) };
      }
    }

    evalXPathUnique(xpath) {
      const res = this.evalXPathMulti(xpath);
      if (res.error) return { ok:false, count:0, node:null, error: res.error };
      if (res.count === 1) return { ok:true, count:1, node: res.nodes[0] || null, error:null };
      return { ok:false, count: res.count, node:null, error:null };
    }
  }

  class TimerManager {
    constructor() {
      this.timers = new Map();
    }

    schedule(entryId, fn, ms) {
      this.cancel(entryId);
      const id = setTimeout(fn, ms);
      this.timers.set(entryId, id);
      return id;
    }

    cancel(entryId) {
      const t = this.timers.get(entryId);
      if (t) clearTimeout(t);
      this.timers.delete(entryId);
    }

    isRunning(entryId) {
      return this.timers.has(entryId);
    }

    getActiveIds() {
      return Array.from(this.timers.keys());
    }

    clear() {
      Array.from(this.timers.keys()).forEach(id => this.cancel(id));
    }
  }

  class ThrottleDetector {
    constructor(wrapper) {
      this.wrapper = wrapper;
      this.throttleStartTime = Date.now();
      this.throttleCounter = 0;
      this.throttleTimer = null;
      this.throttleWarningActive = false;
      this.throttleResetTimer = null;
    }

    start() {
      if (this.throttleTimer) return;
      this.throttleStartTime = performance.now();
      this.throttleCounter = 0;
      
      const scheduleNext = () => {
        const expectedTime = this.throttleStartTime + this.throttleCounter + 100;
        const actualTime = performance.now();
        const correctedDelay = Math.max(1, 100 - (actualTime - expectedTime));
        
        this.throttleTimer = setTimeout(() => {
          this.throttleCounter += 100;
          if (this.throttleTimer !== null) {
            scheduleNext();
          }
        }, correctedDelay);
      };
      
      scheduleNext();
    }

    stop() {
      if (this.throttleTimer) {
        clearTimeout(this.throttleTimer);
        this.throttleTimer = null;
      }
    }

    check() {
      if (!this.throttleTimer) return;

      const actualElapsed = performance.now() - this.throttleStartTime;
      const counterElapsed = this.throttleCounter;
      const difference = Math.abs(actualElapsed - counterElapsed);

      if (difference > 500 && !this.throttleWarningActive) {
        this.showWarning(difference);
      }
    }

    showWarning(lostTimeMs = 0) {
      if (this.throttleWarningActive) return;

      this.throttleWarningActive = true;
      this.wrapper.classList.add('throttle-warning');

      let timeStr;
      if (lostTimeMs < 1000) {
        timeStr = `${Math.round(lostTimeMs)}ms`;
      } else if (lostTimeMs < 60000) {
        const seconds = Math.round(lostTimeMs / 100) / 10;
        timeStr = `${seconds}s`;
      } else {
        const minutes = Math.floor(lostTimeMs / 60000);
        const seconds = Math.round((lostTimeMs % 60000) / 100) / 10;
        timeStr = seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
      }
      this.wrapper.setAttribute('data-throttle-lost', timeStr);

      if (this.throttleResetTimer) clearTimeout(this.throttleResetTimer);
      this.throttleResetTimer = setTimeout(() => {
        this.reset();
      }, 5000);
    }

    reset() {
      this.throttleWarningActive = false;
      this.wrapper.classList.remove('throttle-warning');
      this.wrapper.removeAttribute('data-throttle-lost');
      if (this.throttleResetTimer) {
        clearTimeout(this.throttleResetTimer);
        this.throttleResetTimer = null;
      }
      this.throttleStartTime = performance.now();
      this.throttleCounter = 0;
    }

    cleanup() {
      this.stop();
      if (this.throttleResetTimer) {
        clearTimeout(this.throttleResetTimer);
        this.throttleResetTimer = null;
      }
    }
  }

  class KeyEventInterceptor {
    constructor() {
      this.active = false;
      this.keydownHandler = this.handleKeyEvent.bind(this);
      this.keyupHandler = this.handleKeyEvent.bind(this);
      this.keypressHandler = this.handleKeyEvent.bind(this);
    }

    handleKeyEvent(event) {
      if (this.active) {
        event.stopPropagation();
      }
    }

    activate() {
      if (!this.active) {
        this.active = true;
        document.addEventListener('keydown', this.keydownHandler, true);
        document.addEventListener('keyup', this.keyupHandler, true);
        document.addEventListener('keypress', this.keypressHandler, true);
      }
    }

    deactivate() {
      if (this.active) {
        this.active = false;
        document.removeEventListener('keydown', this.keydownHandler, true);
        document.removeEventListener('keyup', this.keyupHandler, true);
        document.removeEventListener('keypress', this.keypressHandler, true);
      }
    }

    cleanup() {
      this.deactivate();
    }
  }

  class EntryManager {
    constructor(xpathEvaluator, timerManager, storageManager, variableManager) {
      this.xpathEvaluator = xpathEvaluator;
      this.timerManager = timerManager;
      this.storageManager = storageManager;
      this.variableManager = variableManager;
      this.savedTargets = new Map();
      this.autoStopped = new Set();
      this.multiCaches = new Map();
      this.entryPreviousValues = new Map(); // entryId -> Map(variableId -> previousValue)
      this.conditionWaiting = new Set(); // entryIds that are running but condition is false
      this.nextId = 1;
      this.onAutoStop = null; // Callback for when entries auto-stop
      this.onConditionChange = null; // Callback for when condition state changes
    }

    bindEntry(entryId, entriesEl) {
      const row = this.getRow(entryId, entriesEl);
      if (!row) return;

      const xpath = this.getText(row, '.xpath');
      const allowMulti = this.getBool(row, '.multi');
      if (!xpath) {
        this.savedTargets.delete(entryId);
        this.autoStopped.delete(entryId);
        this.setStatusLine(row, "warn", "Provide an XPath to bind.");
        return;
      }

      if (allowMulti) {
        const res = this.xpathEvaluator.evalXPathMulti(xpath);
        if (res.error) {
          this.savedTargets.delete(entryId);
          this.setStatusLine(row, "err", `XPath error: ${res.error}`);
          return;
        }
        const count = res.count >>> 0;
        this.savedTargets.delete(entryId);
        this.autoStopped.delete(entryId);
        if (count === 0) {
          this.setStatusLine(row, "warn", "XPath matched 0 elements.");
        } else {
          const parts = res.nodes.map(n => {
            const preview = this.textPreview(n, 80);
            const previewStr = preview ? ` — "${preview}"` : "";
            return `${this.describeNode(n)}${previewStr}`;
          });
          this.setStatusList(row, "ok", `Bound to ${count} elements:`, parts);
        }
      } else {
        const res = this.xpathEvaluator.evalXPathUnique(xpath);
        if (res.ok && res.node) {
          this.savedTargets.set(entryId, res.node);
          this.autoStopped.delete(entryId);
          const preview = this.textPreview(res.node);
          const previewStr = preview ? ` — "${preview}"` : "";
          this.setStatusLine(row, "ok", `Bound to ${this.describeNode(res.node)}${previewStr}.`);
        } else {
          this.savedTargets.delete(entryId);
          if (res.error) {
            this.setStatusLine(row, "err", `XPath error: ${res.error}`);
          } else {
            const msg = res.count === 0 ? "XPath matched 0 elements." : `XPath matched ${res.count} elements (need exactly 1).`;
            this.setStatusLine(row, "err", msg);
          }
        }
      }
    }

    tryAutoRebind(entryId, entriesEl) {
      const row = this.getRow(entryId, entriesEl);
      if (!row) return false;
      const xpath = this.getText(row, '.xpath');
      if (!xpath) return false;

      const res = this.xpathEvaluator.evalXPathUnique(xpath);
      if (res.ok && res.node) {
        this.savedTargets.set(entryId, res.node);
        this.autoStopped.delete(entryId);
        const preview = this.textPreview(res.node);
        const previewStr = preview ? ` — "${preview}"` : "";
        this.setStatusLine(row, "ok", `Rebound to ${this.describeNode(res.node)}${previewStr}.`);
        return true;
      }
      if (res.error) {
        this.setStatusLine(row, "err", `Rebind failed: ${res.error}`);
      } else if (res.count === 0) {
        this.setStatusLine(row, "warn", "Saved element disappeared; XPath now matches 0 elements. Adjust XPath and bind again.");
      } else {
        this.setStatusLine(row, "warn", `Saved element changed; XPath now matches ${res.count}. Need exactly 1.`);
      }
      return false;
    }

    captureVariableValues(entryId) {
      // Capture current values of all variables
      const currentValues = new Map();
      const variables = this.variableManager.getAllValues();
      for (const [varId, value] of variables) {
        currentValues.set(varId, value);
      }
      
      // Get existing previous values (from last capture) - these are what we'll use for condition evaluation
      const previousValues = this.entryPreviousValues.get(entryId) || new Map();
      
      // Store current values as previous values for next capture
      this.entryPreviousValues.set(entryId, new Map(currentValues));
      
      return previousValues; // Return previous values for condition evaluation
    }

    evaluateCondition(condition, entryId, previousVariables) {
      if (!condition || !condition.trim()) return true;
      
      try {
        const variables = this.variableManager.getAllValues();
        previousVariables = previousVariables || new Map();
        let jsExpression = condition;
        const variableNames = new Set();
        const previousVariableNames = new Set();
        
        // Find all variable names in the condition
        const rows = this.variableManager.variablesEl?.querySelectorAll('.variable-list-item') || [];
        for (const row of rows) {
          const config = row._variableConfig;
          const varName = config?.name;
          if (varName) {
            // Check for current variable references
            if (condition.includes(varName)) {
              variableNames.add(varName);
            }
            // Check for previous variable references (prefixed with "previous")
            const previousVarName = 'previous' + varName.charAt(0).toUpperCase() + varName.slice(1);
            if (condition.includes(previousVarName)) {
              previousVariableNames.add(previousVarName);
            }
          }
        }
        
        // Replace current variables with their values
        for (const [varId, value] of variables) {
          for (const row of rows) {
            if (row.dataset.variableId === varId) {
              const config = row._variableConfig;
              const varName = config?.name;
              if (varName && variableNames.has(varName)) {
                const regex = new RegExp('\\b' + varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
                jsExpression = jsExpression.replace(regex, JSON.stringify(value));
                variableNames.delete(varName);
              }
              break;
            }
          }
        }
        
        // Replace previous variables with their values (from this entry's previous capture)
        for (const [varId, previousValue] of previousVariables) {
          for (const row of rows) {
            if (row.dataset.variableId === varId) {
              const config = row._variableConfig;
              const varName = config?.name;
              if (varName) {
                const previousVarName = 'previous' + varName.charAt(0).toUpperCase() + varName.slice(1);
                if (previousVariableNames.has(previousVarName)) {
                  const regex = new RegExp('\\b' + previousVarName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
                  jsExpression = jsExpression.replace(regex, JSON.stringify(previousValue));
                  previousVariableNames.delete(previousVarName);
                }
              }
              break;
            }
          }
        }
        
        // If any variables weren't replaced, condition cannot be evaluated
        if (variableNames.size > 0 || previousVariableNames.size > 0) {
          return false;
        }
        
        return !!new Function('return ' + jsExpression)();
      } catch (e) {
        console.warn('Condition evaluation error:', e.message);
        return false;
      }
    }

    startTimer(entryId, entriesEl) {
      if (this.timerManager.isRunning(entryId)) return;
      this.autoStopped.delete(entryId);
      
      // Clear previous values and condition state for fresh start
      this.entryPreviousValues.delete(entryId);
      this.conditionWaiting.delete(entryId);
      const loop = () => {
        const row = this.getRow(entryId, entriesEl);
        if (!row) { this.timerManager.cancel(entryId); return; }
        
        // Capture variable values and get previous values for condition evaluation
        const previousValues = this.captureVariableValues(entryId);
        
        const condition = this.getText(row, '.condition');
        const conditionResult = this.evaluateCondition(condition, entryId, previousValues);
        
        if (!conditionResult) {
          // Condition is false - mark as waiting and schedule next attempt
          const wasWaiting = this.conditionWaiting.has(entryId);
          this.conditionWaiting.add(entryId);
          if (!wasWaiting && this.onConditionChange) this.onConditionChange(entryId);
          const ms = row ? this.getNum(row, '.intr', { fallback: 1000 }) : 1000;
          this.timerManager.schedule(entryId, loop, ms);
          return;
        }
        
        // Condition is true - clear waiting state and proceed with click
        const wasWaiting = this.conditionWaiting.has(entryId);
        this.conditionWaiting.delete(entryId);
        if (wasWaiting && this.onConditionChange) this.onConditionChange(entryId);
        
        const allowMulti = this.getBool(row, '.multi');
        if (allowMulti) {
          const xpath = this.getText(row, '.xpath');
          if (!xpath) { this.timerManager.cancel(entryId); return; }
          const updateMs = this.getNum(row, '.update', { fallback: 1000 });
          let cache = this.multiCaches.get(entryId);
          if (!cache) { cache = { nodes: [], lastUpdate: 0 }; this.multiCaches.set(entryId, cache); }
          const now = Date.now();
          if (now - cache.lastUpdate >= updateMs || cache.lastUpdate === 0) {
            const res = this.xpathEvaluator.evalXPathMulti(xpath);
            if (!res.error) {
              cache.nodes = res.nodes || [];
              cache.lastUpdate = now;
            }
          }
          const nodes = cache.nodes || [];
          for (let i=0; i<nodes.length; i++) {
            const n = nodes[i];
            if (n instanceof Element && document.contains(n)) {
              try { n.click(); } catch(_) {}
            }
          }
        } else {
          let target = this.savedTargets.get(entryId);
          if (!(target instanceof Element) || !document.contains(target)) {
            const rebound = this.tryAutoRebind(entryId, entriesEl);
            if (!rebound) {
              this.autoStopped.add(entryId);
              this.savedTargets.delete(entryId);
              this.timerManager.cancel(entryId);
              if (this.onAutoStop) this.onAutoStop(entryId);
              return;
            }
            target = this.savedTargets.get(entryId);
            if (!(target instanceof Element)) {
              this.autoStopped.add(entryId);
              this.savedTargets.delete(entryId);
              this.timerManager.cancel(entryId);
              if (this.onAutoStop) this.onAutoStop(entryId);
              return;
            }
          }
          try { target.click(); } catch(_) {}
        }

        const ms = row ? this.getNum(row, '.intr', { fallback: 1000 }) : 1000;
        this.timerManager.schedule(entryId, loop, ms);
      };
      this.timerManager.schedule(entryId, loop, 0);
    }

    generateEntryId() {
      let candidate;
      do {
        candidate = `entry_${this.nextId++}`;
      } while (this.savedTargets.has(candidate) || this.timerManager.isRunning(candidate));
      return candidate;
    }

    canRun(entryId, entriesEl) {
      const row = this.getRow(entryId, entriesEl);
      const allowMulti = row ? this.getBool(row, '.multi') : false;
      return allowMulti ? !!(row && this.getText(row, '.xpath')) : this.savedTargets.has(entryId);
    }

    isAutoStopped(entryId) {
      return this.autoStopped.has(entryId);
    }

    isConditionWaiting(entryId) {
      return this.conditionWaiting.has(entryId);
    }

    // Continuously evaluate condition states for all running entries without modifying previous values
    reevaluateAllConditions(entriesEl) {
      for (const entryId of this.timerManager.timers.keys()) {
        const row = this.getRow(entryId, entriesEl);
        if (!row) continue;
        
        const condition = this.getText(row, '.condition');
        if (!condition || !condition.trim()) {
          // No condition - should not be waiting
          const wasWaiting = this.conditionWaiting.has(entryId);
          this.conditionWaiting.delete(entryId);
          if (wasWaiting && this.onConditionChange) this.onConditionChange(entryId);
          continue;
        }
        
        // Get stored previous values for this entry (don't modify them)
        const previousValues = this.entryPreviousValues.get(entryId) || new Map();
        
        // Evaluate condition using current variables and stored previous values
        const conditionResult = this.evaluateCondition(condition, entryId, previousValues);
        const isWaiting = !conditionResult;
        const wasWaiting = this.conditionWaiting.has(entryId);
        
        if (isWaiting !== wasWaiting) {
          if (isWaiting) {
            this.conditionWaiting.add(entryId);
          } else {
            this.conditionWaiting.delete(entryId);
          }
          if (this.onConditionChange) this.onConditionChange(entryId);
        }
      }
    }

    cleanup(entryId) {
      this.timerManager.cancel(entryId);
      this.savedTargets.delete(entryId);
      this.autoStopped.delete(entryId);
      this.multiCaches.delete(entryId);
      this.entryPreviousValues.delete(entryId);
      this.conditionWaiting.delete(entryId);
    }

    // Helper methods
    getRow(entryId, entriesEl) {
      return entriesEl.querySelector(`.entry[data-entry-id="${entryId}"]`);
    }

    getText(row, sel) {
      const el = row?.querySelector(sel);
      const v = (el && typeof el.value === 'string') ? el.value : '';
      return v.trim();
    }

    getBool(row, sel) {
      return !!row?.querySelector(sel)?.checked;
    }

    getNum(row, sel, opts = {}) {
      const { min, fallback } = opts || {};
      const el = row?.querySelector(sel);
      let n = parseInt(el?.value, 10);
      if (!Number.isFinite(n)) n = (typeof fallback === 'number' ? fallback : 0);
      if (typeof min === 'number') n = Math.max(min, n);
      return n;
    }

    textPreview(node, max = 80) {
      if (!(node instanceof Element)) return "";
      const raw = (node.innerText ?? node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (!raw) return "";
      return raw.length > max ? raw.slice(0, max-1) + "…" : raw;
    }

    describeNode(n) {
      if (!(n instanceof Element)) return String(n);
      const tag = n.tagName ? n.tagName.toLowerCase() : "node";
      const id  = n.id ? `#${n.id}` : "";
      const cls = n.classList && n.classList.length ? "." + Array.from(n.classList).slice(0,2).join(".") + (n.classList.length>2?"…":"") : "";
      return `<${tag}${id}${cls}>`;
    }

    setStatusLine(row, kind, text) {
      let el = row.querySelector('.statusline');
      if (!el) { el = document.createElement("div"); el.className = "statusline"; row.appendChild(el); }
      el.className = "statusline " + (kind==="ok"?"status-ok":kind==="warn"?"status-warn":"status-err");
      el.textContent = text;
    }

    setStatusList(row, kind, header, lines) {
      let el = row.querySelector('.statusline');
      if (!el) { el = document.createElement("div"); el.className = "statusline"; row.appendChild(el); }
      el.className = "statusline " + (kind==="ok"?"status-ok":kind==="warn"?"status-warn":"status-err");
      el.textContent = header;
      const old = el.querySelector('.status-items');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      const list = document.createElement('div');
      list.className = 'status-items';
      lines.forEach(line => { const d=document.createElement('div'); d.className='status-item'; d.textContent=String(line); list.appendChild(d); });
      el.appendChild(list);
    }
  }

  class VariableManager {
    constructor(xpathEvaluator, storageManager) {
      this.xpathEvaluator = xpathEvaluator;
      this.storageManager = storageManager;
      this.nextId = 1;
      this.values = new Map(); // variableId -> current value
      this.watchedElements = new Map(); // variableId -> { element, observer }
      this.variablesEl = null; // Will be set by AutoClickBot
      this.refreshInterval = null;
      this.REFRESH_INTERVAL_MS = 250; // Fallback refresh every 250ms for responsiveness
      this.onVariableChange = null; // Callback for when any variable value changes
    }

    generateVariableId() {
      let candidate;
      do { 
        candidate = `var_${this.nextId++}`; 
      } while (this.values.has(candidate));
      return candidate;
    }

    evaluateVariable(variableId, variablesEl) {
      const row = this.getRow(variableId, variablesEl);
      if (!row) return null;

      // Get config from the new list item format
      const config = row._variableConfig;
      if (!config) return null;

      const xpath = config.xpath;
      const regex = config.regex;
      const type = config.type || 'number';

      if (!xpath) {
        this.cleanupElementObserver(variableId);
        return null;
      }

      const res = this.xpathEvaluator.evalXPathUnique(xpath);
      if (!res.ok || !res.node) {
        this.cleanupElementObserver(variableId);
        // Clear cached value
        this.values.delete(variableId);
        if (res.error) {
          this.setStatusLine(row, "err", `XPath error: ${res.error}`);
        } else {
          const msg = res.count === 0 ? "XPath matched 0 elements." : `XPath matched ${res.count} elements (need exactly 1).`;
          this.setStatusLine(row, "err", msg);
        }
        return null;
      }

      // Extract text content based on element type
      let textValue = this.getElementText(res.node);
      
      // Apply regex if provided
      if (regex) {
        try {
          const match = new RegExp(regex).exec(textValue);
          if (match) {
            textValue = match[1] !== undefined ? match[1] : match[0];
          } else {
            this.setStatusLine(row, "warn", `Regex "${regex}" didn't match.`);
            this.cleanupElementObserver(variableId);
            this.values.delete(variableId);
            return null;
          }
        } catch (e) {
          this.setStatusLine(row, "err", `Regex error: ${e.message}`);
          this.cleanupElementObserver(variableId);
          this.values.delete(variableId);
          return null;
        }
      }

      // Convert to desired type
      let finalValue;
      if (type === 'number') {
        finalValue = parseFloat(textValue);
        if (isNaN(finalValue)) {
          this.setStatusLine(row, "err", `Cannot convert "${textValue}" to number.`);
          this.cleanupElementObserver(variableId);
          this.values.delete(variableId);
          return null;
        }
      } else {
        finalValue = String(textValue);
      }

      // Check if value actually changed before updating
      const previousValue = this.values.get(variableId);
      const valueChanged = previousValue !== finalValue;
      
      this.values.set(variableId, finalValue);
      
      // Clear any error statusline on successful evaluation
      const statusEl = row.querySelector('.statusline');
      if (statusEl) {
        statusEl.remove();
        // Update display to reflect cleared error state
        if (this.autoClickBot && this.autoClickBot.updateVariableDisplay) {
          this.autoClickBot.updateVariableDisplay(row);
        }
      }
      
      // Trigger callback if value changed
      if (valueChanged && this.onVariableChange) {
        this.onVariableChange(variableId, finalValue, previousValue);
      }
      
      // Set up observer for this element to auto-refresh on changes
      this.setupElementObserver(variableId, res.node);
      
      return finalValue;
    }

    getElementText(element) {
      if (!element) return '';
      
      // For input elements, use value
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
        return element.value || '';
      }
      
      // For other elements, prefer textContent
      return element.textContent || element.innerText || '';
    }

    getValue(variableId) {
      return this.values.get(variableId);
    }

    getAllValues() {
      return new Map(this.values);
    }

    // Helper methods (similar to EntryManager)
    getRow(variableId, variablesEl) {
      return variablesEl.querySelector(`.variable-list-item[data-variable-id="${variableId}"]`);
    }

    getText(row, sel) {
      const el = row?.querySelector(sel);
      const v = (el && typeof el.value === 'string') ? el.value : '';
      return v.trim();
    }

    setStatusLine(row, kind, text) {
      let el = row.querySelector('.statusline');
      if (!el) { 
        el = document.createElement("div"); 
        el.className = "statusline"; 
        row.appendChild(el); 
      }
      el.className = "statusline " + (kind==="ok"?"status-ok":kind==="warn"?"status-warn":"status-err");
      el.textContent = text;
      
      
      // Update the variable display to reflect error state
      if (this.autoClickBot && this.autoClickBot.updateVariableDisplay) {
        this.autoClickBot.updateVariableDisplay(row);
      }
    }

    startAutoRefresh() {
      if (this.refreshInterval) return;
      
      // Start periodic refresh as fallback
      this.refreshInterval = setInterval(() => {
        if (!this.variablesEl) return;
        
        const rows = Array.from(this.variablesEl.querySelectorAll('.variable-list-item'));
        rows.forEach(row => {
          const id = row.dataset.variableId;
          if (id) this.evaluateVariable(id, this.variablesEl);
        });
      }, this.REFRESH_INTERVAL_MS);
    }

    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
      
      // Clean up all observers
      for (const [variableId, watched] of this.watchedElements) {
        if (watched.observer) {
          watched.observer.disconnect();
        }
      }
      this.watchedElements.clear();
    }

    setupElementObserver(variableId, element) {
      // Clean up existing observer if any
      this.cleanupElementObserver(variableId);
      
      if (!element) return;
      
      // Create a MutationObserver to watch for changes
      const observer = new MutationObserver((mutations) => {
        let shouldUpdate = false;
        
        for (const mutation of mutations) {
          // Check if the target element or its content changed
          if (mutation.type === 'childList' || 
              mutation.type === 'characterData' ||
              (mutation.type === 'attributes' && 
               (mutation.attributeName === 'value' || 
                mutation.attributeName === 'data-value' ||
                mutation.attributeName === 'textContent'))) {
            shouldUpdate = true;
            break;
          }
          
          // Also check if target element is affected directly
          if (mutation.target === element || element.contains(mutation.target)) {
            shouldUpdate = true;
            break;
          }
        }
        
        if (shouldUpdate && this.variablesEl) {
          // For critical changes, update immediately
          const isCriticalChange = mutations.some(m => 
            m.type === 'characterData' || 
            (m.type === 'attributes' && m.attributeName === 'value') ||
            (m.type === 'childList' && m.target === element)
          );
          
          if (isCriticalChange) {
            // Immediate update for critical changes
            this.evaluateVariable(variableId, this.variablesEl);
          } else {
            // Minimal debounce for other changes
            if (this.debounceTimer) clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
              this.evaluateVariable(variableId, this.variablesEl);
            }, 10);
          }
        }
      });
      
      // Observe the element and its subtree comprehensively
      observer.observe(element, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        characterDataOldValue: true,
        attributeFilter: ['value', 'data-value', 'textContent', 'innerHTML']
      });
      
      // Also observe parent to catch direct textContent changes
      if (element.parentNode) {
        observer.observe(element.parentNode, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['value', 'textContent']
        });
      }
      
      // For input elements, also listen for input events
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
        const inputHandler = () => {
          // Immediate update for user input - no debounce needed
          if (this.variablesEl) {
            this.evaluateVariable(variableId, this.variablesEl);
          }
        };
        
        element.addEventListener('input', inputHandler);
        element.addEventListener('change', inputHandler);
        
        // Store event handlers for cleanup
        this.watchedElements.set(variableId, {
          element,
          observer,
          inputHandler,
          hasEventListeners: true
        });
      } else {
        this.watchedElements.set(variableId, {
          element,
          observer,
          hasEventListeners: false
        });
      }
    }

    cleanupElementObserver(variableId) {
      const watched = this.watchedElements.get(variableId);
      if (watched) {
        if (watched.observer) {
          watched.observer.disconnect();
        }
        if (watched.hasEventListeners && watched.element && watched.inputHandler) {
          watched.element.removeEventListener('input', watched.inputHandler);
          watched.element.removeEventListener('change', watched.inputHandler);
        }
        this.watchedElements.delete(variableId);
      }
    }

    cleanup() {
      this.stopAutoRefresh();
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }
  }

  class AutoClickBot {
    constructor() {
      this.storageManager = new StorageManager();
      this.xpathEvaluator = new XPathEvaluator();
      this.timerManager = new TimerManager();
      this.variableManager = new VariableManager(this.xpathEvaluator, this.storageManager);
      this.variableManager.autoClickBot = this; // Set reference for display updates
      this.entryManager = new EntryManager(this.xpathEvaluator, this.timerManager, this.storageManager, this.variableManager);
      this.keyEventInterceptor = new KeyEventInterceptor();
      this.pills = new Map();

      // Set up callback for auto-stop events
      this.entryManager.onAutoStop = (entryId) => {
        this.updatePill(entryId);
      };

      // Set up callback for condition state changes
      this.entryManager.onConditionChange = (entryId) => {
        this.updatePill(entryId);
      };

      // Set up callback for variable changes to trigger continuous condition evaluation
      this.variableManager.onVariableChange = () => {
        this.entryManager.reevaluateAllConditions(this.entriesEl);
      };

      this.init();
    }

    init() {
      this.createUI();
      this.setupEventListeners();
      this.loadConfiguration();
      this.startThrottleDetection();
    }

    createUI() {
      // Clean old
      const existing = document.getElementById(WIDGET_ID);
      if (existing) existing.remove();

      // Host + Shadow
      this.host = document.createElement("div");
      this.host.id = WIDGET_ID;
      this.host.dataset.startedAt = String(Date.now());
      this.host.style.position = "fixed";
      this.host.style.bottom = "10px";
      this.host.style.right  = "10px";
      this.host.style.zIndex = MAX_Z;
      document.body.appendChild(this.host);
      this.shadow = this.host.attachShadow({ mode: "open" });

      // Styles
      const style = document.createElement("style");
      style.textContent = `
        *{box-sizing:border-box}
        .panel{
          font-family: ui-sans-serif,-apple-system, Segoe UI, Roboto, Arial, sans-serif;
          padding:8px;
          background:rgba(30,30,30,.95);
          color:#fff;
          border:3px solid rgba(30,30,30,.95);
          border-radius:12px;
          box-shadow:0 6px 20px rgba(0,0,0,.35);
          min-width:340px;
          display:flex; flex-direction:column; gap:6px;
          position:relative;
        }
        .header{display:flex; align-items:center; justify-content:space-between}
        .drag{cursor:move; user-select:none; opacity:.7; font-size:12px}
        .hidden{display:none !important}

        .config-wrapper{
          position:absolute;
          right:0;
          bottom:calc(100% + 8px);
          width:1280px;
          max-width:95vw;
          max-height:70vh;
          overflow:auto;
          background:rgba(30,30,30,.98);
          border:1px solid rgba(255,255,255,.2);
          border-radius:12px;
          padding:10px;
          box-shadow:0 10px 28px rgba(0,0,0,.4);
          display:flex;
          gap:10px;
        }
        .config-tab{
          flex:1;
          display:flex;
          flex-direction:column;
          gap:8px;
          min-width:0;
        }
        .tab-header{
          font-weight:bold;
          font-size:14px;
          padding:6px 0;
          border-bottom:1px solid rgba(255,255,255,.2);
          margin-bottom:8px;
        }
        .entries, .variables{display:flex; flex-direction:column; gap:12px; max-height:none; padding-right:4px}
        .entry{
          border:1px solid rgba(255,255,255,.2);
          border-radius:10px;
          padding:8px;
          display:grid; gap:6px;
          grid-template-columns: auto 1fr;
          align-items:center;
        }
        .variables-container{
          border:1px solid rgba(255,255,255,.2);
          border-radius:4px;
        }
        .variable-list-item{
          position:relative;
          border-bottom:1px solid rgba(255,255,255,.1);
          padding:4px 6px 4px 30px;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:6px;
          min-height:24px;
          cursor:default;
          transition:all 0.2s ease-out;
        }
        .variable-list-item:last-child{
          border-bottom:none;
        }
        .variable-drag-handle{
          position:absolute;
          left:8px;
          top:50%;
          transform:translateY(-50%);
          width:14px;
          height:20px;
          cursor:move;
          display:flex;
          flex-direction:column;
          justify-content:space-evenly;
          align-items:center;
          opacity:0.7;
          transition:all 0.2s;
          border-radius:3px;
          z-index:10;
        }
        .variable-drag-handle:hover{
          opacity:1;
          background:rgba(255,255,255,0.15);
          transform:translateY(-50%) scale(1.1);
        }
        .variable-drag-handle::before,
        .variable-drag-handle::after{
          content:'●';
          font-size:4px;
          line-height:1;
          color:rgba(255,255,255,0.8);
        }
        .variable-drag-handle .dot{
          font-size:4px;
          line-height:1;
          color:rgba(255,255,255,0.8);
        }
        .variable-drag-handle .dot::before{
          content:'●';
        }
        .variable-list-item:hover{
          background-color:rgba(255,255,255,.05);
        }
        .variable-list-item.dragging{
          opacity:0.6;
          background-color:rgba(255,255,255,.15);
        }
        .variables-container{
          position:relative;
        }
        .variable-list-item .variable-info{
          flex:1;
          min-width:0;
          display:flex;
          align-items:center;
          gap:6px;
        }
        .variable-list-item .variable-name{
          font-weight:bold;
          font-size:12px;
          min-width:80px;
        }
        .variable-list-item .variable-value{
          font-size:11px;
          opacity:.8;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
          display:flex;
          align-items:center;
          gap:4px;
        }
        .variable-list-item .variable-current-value{
          font-weight:500;
        }
        .variable-list-item .variable-type{
          opacity:0.6;
          font-size:10px;
        }
        .variable-list-item .edit-btn{
          padding:4px 8px;
          font-size:11px;
          white-space:nowrap;
        }
        .variable-list-item.editing{
          flex-direction:column;
          align-items:stretch;
          padding:8px;
        }
        .variable-list-item.editing .variable-summary{
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:8px;
          gap:8px;
        }
        .variable-list-item .variable-summary-info{
          flex:1;
          min-width:0;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .variable-list-item .variable-summary-value{
          opacity:0.8;
          font-weight:normal;
        }
        .variable-list-item .remove-btn{
          padding:4px 8px;
          font-size:11px;
        }
        .variable-list-item.editing .variable-fields{
          display:grid;
          grid-template-columns:auto 1fr;
          gap:6px;
          align-items:center;
        }
        .hidden{display:none!important}
        .config-actions{display:flex; gap:8px; justify-content:flex-end; margin-top:10px; padding-top:8px}
        .label{font-size:12px; opacity:.9; text-align:right; white-space:nowrap}
        input[type="text"], input[type="number"], select{
          padding:6px 8px; border-radius:8px; border:1px solid rgba(255,255,255,.25);
          background:rgba(255,255,255,.1); color:#fff; outline:none; width:100%;
        }
        select{
          cursor:pointer;
        }
        .statusline{grid-column:1/-1; font-size:12px; opacity:.95}
        .status-items{margin-top:2px; display:flex; flex-direction:column; gap:2px}
        .status-item{white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
        .status-ok{color:#86efac}
        .status-warn{color:#fde68a}
        .status-err{color:#fca5a5}
        .row-full{grid-column:1/-1; display:flex; justify-content:flex-end; gap:6px}
        .inline{display:flex; align-items:center; gap:8px}

        .actions{display:flex; align-items:center; gap:8px; flex-wrap:wrap}
        .pill-row{display:flex; gap:6px; flex-wrap:wrap; align-items:center}
        .pill-row:empty{display:none}
        .icons{margin-left:auto; display:flex; gap:6px; align-items:center}

        button{
          border:none; padding:6px 10px; border-radius:10px; cursor:pointer; background:#444; color:#fff;
          box-shadow:0 4px 12px rgba(0,0,0,.25);
        }
        .pill{border-radius:16px; padding:4px 10px; font-size:12px}
        .pill.disabled{opacity:.5; cursor:not-allowed}
        .running{background:#c33}
        .autostopped{background:#b76}
        .condition-waiting{background:#f39c12}
        .icon{ width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:#666; box-shadow:none; }

        .throttle-warning{
          animation: throttleAlert 1s ease-in-out infinite alternate;
          border: 3px solid #ff4444 !important;
          position: relative;
        }
        .throttle-warning::after {
          content: "Throttling detected, lost " attr(data-throttle-lost);
          position: absolute;
          top: -32px;
          right: -3px;
          background: #ff4444;
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          white-space: nowrap;
        }
        @keyframes throttleAlert {
          0% { background: rgba(30,30,30,.95); }
          100% { background: rgba(255,68,68,.95); }
        }
      `;
      this.shadow.append(style, document.createElement("div"));

      // UI shell
      this.wrapper = this.shadow.querySelector("div");
      this.wrapper.className = "panel";
      this.wrapper.innerHTML = `
        <div class="header">
          <div>AutoClick</div>
          <div class="drag" title="Drag">⠿</div>
        </div>

        <div class="config-wrapper hidden" id="configWrapper">
          <div class="config-tab">
            <div class="tab-header">Variables</div>
            <div class="variables" id="variables"></div>
            <div class="config-actions">
              <button id="addVariable">+ Add Variable</button>
            </div>
          </div>
          <div class="config-tab">
            <div class="tab-header">Automation Entries</div>
            <div class="entries" id="entries"></div>
            <div class="config-actions">
              <button id="hotReload" title="Reload AutoClick from clipboard" aria-label="Hot Reload">Hot Reload</button>
              <button id="refresh" title="Rebind all entries and refresh matches" aria-label="Refresh Bindings">Refresh</button>
              <button id="add">+ Add Entry</button>
              <button id="closeWidget" title="Close AutoClick widget" aria-label="Close Widget">✕ Close</button>
            </div>
          </div>
        </div>

        <div class="actions">
          <div class="pill-row" id="pillRow"></div>
          <div class="icons">
            <button id="toggleConfig" class="icon" title="Configuration">⚙️</button>
          </div>
        </div>

      `;

      // Get element references
      this.entriesEl     = this.shadow.getElementById("entries");
      this.variablesEl   = this.shadow.getElementById("variables");
      this.pillRowEl     = this.shadow.getElementById("pillRow");
      this.btnAdd        = this.shadow.getElementById("add");
      this.btnAddVariable = this.shadow.getElementById("addVariable");
      this.btnHotReload  = this.shadow.getElementById("hotReload");
      this.btnRefresh    = this.shadow.getElementById("refresh");
      this.btnToggleConf = this.shadow.getElementById("toggleConfig");
      this.btnCloseWidget = this.shadow.getElementById("closeWidget");
      this.configWrapper = this.shadow.getElementById("configWrapper");
      this.dragHandle    = this.wrapper.querySelector(".drag");

      // Initialize throttle detector
      this.throttleDetector = new ThrottleDetector(this.wrapper);
      
      // Set up variable manager reference and start auto-refresh
      this.variableManager.variablesEl = this.variablesEl;
      this.variableManager.onVariableChange = (variableId, newValue, previousValue) => {
        const row = this.variablesEl.querySelector(`[data-variable-id="${variableId}"]`);
        if (row) {
          if (arguments.length >= 2 && newValue !== previousValue) {
            // Only value changed - update just the current value part
            this.updateVariableCurrentValue(row, newValue);
          } else {
            // Full update needed (name change, error state, etc.)
            this.updateVariableDisplay(row);
          }
        }
        // Trigger continuous condition evaluation for all running entries
        this.entryManager.reevaluateAllConditions(this.entriesEl);
      };
      this.variableManager.startAutoRefresh();
    }

    setupEventListeners() {
      // Add entry button
      this.btnAdd.addEventListener("click", () => {
        const row = this.createEntryRow({ name: "", xpath: "", interval: 1000 });
        this.entriesEl.appendChild(row);
        const nameInput = row.querySelector('.name');
        if (nameInput) nameInput.focus();
        this.saveConfig();
        this.entryManager.bindEntry(row.dataset.entryId, this.entriesEl);
        this.reconcileAll();
      });

      // Add variable button
      this.btnAddVariable.addEventListener("click", () => {
        const config = { name: "", xpath: "", regex: "", type: "number" };
        const newId = this.variableManager.generateVariableId();
        config.id = newId;
        const row = this.createVariableRow(config);
        
        // Get or create variables container
        let container = this.variablesEl.querySelector('.variables-container');
        if (!container) {
          container = document.createElement("div");
          container.className = "variables-container";
          this.variablesEl.appendChild(container);
        }
        
        container.appendChild(row);
        this.expandVariableForEditing(row);
        this.saveVariables();
      });

      // Hot reload button
      this.btnHotReload.addEventListener("click", async () => {
        let code = "";
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            code = await navigator.clipboard.readText();
          }
        } catch(_) {}
        if (!code || !code.trim()) { alert("Clipboard is empty or blocked. Copy the updated AutoClick script first."); return; }
        const MAX_LEN = 500000;
        const looksWrapped = /\(function\s*\(/.test(code);
        const hasWidgetId = code.includes(WIDGET_ID);
        if (code.length > MAX_LEN || !looksWrapped || !hasWidgetId) {
          alert("Clipboard content doesn't look like an AutoClick script.");
          return;
        }
        const activeIds = this.timerManager.getActiveIds();
        this.storageManager.saveHotReloadState(activeIds);
        this.cleanup();
        setTimeout(() => { try { new Function(`${code}\n//# sourceURL=bot.js`)(); } catch(e){ console.error("AutoClick reload error", e); alert("Failed to execute reloaded script: " + e); } }, 0);
      });

      // Refresh button
      this.btnRefresh.addEventListener("click", () => {
        this.refreshAllBindings();
      });

      // Toggle config button
      this.btnToggleConf.addEventListener("click", () => {
        this.configWrapper.classList.toggle("hidden");
        const isConfigVisible = !this.configWrapper.classList.contains("hidden");
        if (isConfigVisible) {
          this.keyEventInterceptor.activate();
        } else {
          this.keyEventInterceptor.deactivate();
        }
      });

      // Close widget button
      this.btnCloseWidget.addEventListener("click", () => {
        this.cleanup();
      });

      // Drag functionality
      this.setupDragFunctionality();
    }

    setupDragFunctionality() {
      let sx, sy, sb, sr, drag = false;
      this.dragHandle.addEventListener("mousedown", e => {
        drag = true; sx = e.clientX; sy = e.clientY;
        const r = this.host.getBoundingClientRect();
        sb = window.innerHeight - r.bottom; sr = window.innerWidth - r.right;
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", () => { drag=false; document.removeEventListener("mousemove", onMove); }, { once:true });
        e.preventDefault();
      });
      const onMove = (e) => {
        if (!drag) return;
        this.host.style.bottom = Math.max(0, sb - (e.clientY - sy)) + "px";
        this.host.style.right  = Math.max(0, sr - (e.clientX - sx)) + "px";
      };
    }

    loadConfiguration() {
      this.setDOMFromConfig(this.storageManager.loadConfig());
      this.setDOMFromVariables(this.storageManager.loadVariables());

      // Resume any running entries saved by Hot Reload
      const data = this.storageManager.loadHotReloadState();
      if (data && Array.isArray(data.activeIds) && data.activeIds.length) {
        data.activeIds.forEach(id => { try { this.startTimer(id); } catch(_) {} });
      }
      this.storageManager.clearHotReloadState();
    }

    startThrottleDetection() {
      this.throttleDetector.start();

      // Add visibility change listener
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.throttleDetector.check();
        }
      });
    }

    // Configuration management methods
    getConfigFromDOM() {
      return Array.from(this.entriesEl.querySelectorAll('.entry')).map(row => ({
        id: row.dataset.entryId,
        name: this.getText(row, '.name'),
        xpath: this.getText(row, '.xpath'),
        interval: this.getNum(row, '.intr', { fallback: 1000 }),
        allowMultiple: this.getBool(row, '.multi'),
        updateEvery: this.getNum(row, '.update', { fallback: 1000 }),
        condition: this.getText(row, '.condition'),
      }));
    }

    saveConfig() {
      this.storageManager.saveConfig(this.getConfigFromDOM());
    }

    getVariablesFromDOM() {
      return Array.from(this.variablesEl.querySelectorAll('.variable-list-item')).map(row => {
        const config = row._variableConfig;
        return config ? {
          id: config.id,
          name: config.name,
          xpath: config.xpath,
          regex: config.regex,
          type: config.type || 'number'
        } : null;
      }).filter(Boolean);
    }

    saveVariables() {
      this.storageManager.saveVariables(this.getVariablesFromDOM());
    }

    setDOMFromVariables(cfg) {
      this.variablesEl.innerHTML = "";
      
      // Create container only if we have variables
      if (Array.isArray(cfg) && cfg.length) {
        const container = document.createElement("div");
        container.className = "variables-container";
        
        const maxSeen = cfg.reduce((max, v) => {
          const m = typeof v?.id === "string" ? v.id.match(/^var_(\d+)$/) : null;
          const n = m ? parseInt(m[1], 10) : NaN;
          return Number.isFinite(n) && n > max ? n : max;
        }, 0);
        if (maxSeen + 1 > this.variableManager.nextId) this.variableManager.nextId = maxSeen + 1;
        
        cfg.forEach(v => {
          if (v && typeof v === "object" && v.id) {
            const row = this.createVariableRow(v);
            container.appendChild(row);
            this.variableManager.evaluateVariable(v.id, this.variablesEl);
          }
        });
        
        this.variablesEl.appendChild(container);
      }
    }

    setDOMFromConfig(cfg) {
      this.entriesEl.innerHTML = "";
      if (Array.isArray(cfg) && cfg.length) {
        const maxSeen = cfg.reduce((max, ent) => {
          const m = typeof ent?.id === "string" ? ent.id.match(/^entry_(\d+)$/) : null;
          const n = m ? parseInt(m[1], 10) : NaN;
          return Number.isFinite(n) && n > max ? n : max;
        }, 0);
        if (maxSeen + 1 > this.entryManager.nextId) this.entryManager.nextId = maxSeen + 1;
      }
      const list = Array.isArray(cfg) ? cfg : [];
      list.forEach(ent => this.entriesEl.appendChild(this.createEntryRow(ent)));
      Array.from(this.entriesEl.querySelectorAll('.entry')).forEach(row => this.entryManager.bindEntry(row.dataset.entryId, this.entriesEl));
      this.reconcileAll();
    }

    // Entry row creation
    createEntryRow(data) {
      const id = data?.id ?? this.entryManager.generateEntryId();
      const nameV = data?.name ?? "";
      const xpV = data?.xpath ?? "";
      const intrV = data?.interval ?? 1000;

      const row = document.createElement("div");
      row.className = "entry";
      row.dataset.entryId = id;

      const mkLabel = text => { const d=document.createElement("div"); d.className="label"; d.textContent=text; return d; };
      const nameI = document.createElement("input");
      nameI.className = "name"; nameI.type = "text"; nameI.placeholder = "Name (pill label)"; nameI.value = nameV;
      const xpI = document.createElement("input");
      xpI.className = "xpath"; xpI.type = "text"; xpI.placeholder = "XPath — must match exactly one"; xpI.value = xpV;
      const intrI = document.createElement("input");
      intrI.className = "intr"; intrI.type = "number"; intrI.value = intrV;

      const multiI = document.createElement("input");
      multiI.className = "multi"; multiI.type = "checkbox";
      multiI.checked = !!(data?.allowMultiple);

      const updateI = document.createElement("input");
      updateI.className = "update"; updateI.type = "number"; updateI.min = "100"; updateI.value = (data?.updateEvery ?? 1000);

      const conditionI = document.createElement("input");
      conditionI.className = "condition"; conditionI.type = "text"; conditionI.placeholder = "Optional condition using variables (e.g., score > 100 && lives >= 3)"; conditionI.value = (data?.condition ?? "");

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";

      row.appendChild(mkLabel("Name"));            row.appendChild(nameI);
      row.appendChild(mkLabel("XPath"));           row.appendChild(xpI);
      row.appendChild(mkLabel("Interval (ms)"));   row.appendChild(intrI);
      row.appendChild(mkLabel("Condition"));       row.appendChild(conditionI);
      row.appendChild(mkLabel("Allow multiple"));
      const multiRow = document.createElement("div");
      multiRow.className = "inline";
      const updateLbl = mkLabel("Update every (ms)");
      multiRow.appendChild(multiI);
      multiRow.appendChild(updateLbl);
      multiRow.appendChild(updateI);
      row.appendChild(multiRow);

      const status = document.createElement("div");
      status.className = "statusline status-warn";
      status.textContent = "Provide an XPath to bind.";
      row.appendChild(status);

      const actions = document.createElement("div");
      actions.className = "row-full";
      actions.appendChild(removeBtn);
      row.appendChild(actions);

      // Events
      nameI.addEventListener("input", () => { this.saveConfig(); this.updatePill(id); });
      xpI.addEventListener("input", () => {
        this.saveConfig();
        this.entryManager.multiCaches.delete(id);
        this.entryManager.bindEntry(id, this.entriesEl);
        this.reconcileAll();
      });
      intrI.addEventListener("input", () => { this.saveConfig(); this.updatePill(id); });
      updateI.addEventListener("input", () => { this.saveConfig(); });
      conditionI.addEventListener("input", () => { this.saveConfig(); });
      multiI.addEventListener("change", () => {
        this.saveConfig();
        if (multiI.checked) {
          this.entryManager.savedTargets.delete(id);
          this.entryManager.autoStopped.delete(id);
        }
        this.entryManager.multiCaches.delete(id);
        this.entryManager.bindEntry(id, this.entriesEl);
        this.reconcileAll();
      });

      const applyMultiUI = () => {
        const show = !!multiI.checked;
        updateLbl.style.display = show ? "" : "none";
        updateI.style.display = show ? "" : "none";
        xpI.placeholder = show ? "XPath — can match multiple" : "XPath — must match exactly one";
      };
      applyMultiUI();
      multiI.addEventListener("change", applyMultiUI);

      removeBtn.addEventListener("click", () => {
        this.entryManager.cleanup(id);
        this.removePill(id);
        row.remove();
        this.saveConfig();
        this.reconcileAll();
      });

      return row;
    }

    createVariableRow(cfg) {
      const id = cfg.id || this.variableManager.generateVariableId();
      
      const row = document.createElement("div");
      row.className = "variable-list-item";
      row.dataset.variableId = id;

      // Store the config data on the row for later retrieval
      row._variableConfig = {
        id: id,
        name: cfg.name || "",
        xpath: cfg.xpath || "",
        regex: cfg.regex || "",
        type: cfg.type || "number"
      };

      // Create the compact summary view
      this.createVariableSummary(row);
      
      // Add drag and drop functionality (after summary is created)
      this.setupVariableDragDrop(row);
      
      // Update the display immediately
      this.updateVariableDisplay(row);

      return row;
    }

    setupVariableDragDrop(row) {
      // Get the drag handle
      const dragHandle = row.querySelector('.variable-drag-handle');
      if (!dragHandle) {
        return;
      }
      
      const autoClickBot = this;
      let isDragging = false;
      let draggedRow = null;
      let originalNextSibling = null;
      let variableBoundaries = [];
      let lastCrossedBoundary = -1;
      
      const handleMouseMove = (e) => {
        if (!isDragging || !draggedRow) return;
        
        const container = autoClickBot.variablesEl.querySelector('.variables-container');
        if (!container) return;
        
        // Determine which boundary we've crossed based on Y position
        let crossedBoundary = -1;
        for (let i = 0; i < variableBoundaries.length; i++) {
          if (e.clientY <= variableBoundaries[i].bottom) {
            crossedBoundary = i;
            break;
          }
        }
        
        // If we haven't crossed any boundary, we're below all variables
        if (crossedBoundary === -1) {
          crossedBoundary = variableBoundaries.length - 1;
        }
        
        // Only move if we've actually crossed to a different boundary
        if (crossedBoundary !== lastCrossedBoundary) {
          lastCrossedBoundary = crossedBoundary;
          
          const allRows = Array.from(container.querySelectorAll('.variable-list-item'));
          const draggedIndex = allRows.indexOf(draggedRow);
          
          // Don't move if we're trying to move to our current position
          if (crossedBoundary === draggedIndex) {
            return;
          }
          
          // Move the dragged row to the new position
          const targetRow = allRows[crossedBoundary];
          if (targetRow && targetRow !== draggedRow) {
            if (crossedBoundary > draggedIndex) {
              // Moving down: insert after target
              container.insertBefore(draggedRow, targetRow.nextSibling);
            } else {
              // Moving up: insert before target
              container.insertBefore(draggedRow, targetRow);
            }
            
            // Recalculate boundaries after DOM change
            updateBoundaries();
          }
        }
      };
      
      const updateBoundaries = () => {
        const container = autoClickBot.variablesEl.querySelector('.variables-container');
        if (!container) return;
        
        variableBoundaries = [];
        const allRows = Array.from(container.querySelectorAll('.variable-list-item'));
        
        for (const row of allRows) {
          const rect = row.getBoundingClientRect();
          variableBoundaries.push({
            top: rect.top,
            bottom: rect.bottom,
            element: row
          });
        }
      };
      
      const handleMouseUp = () => {
        if (!isDragging || !draggedRow) return;
        
        isDragging = false;
        draggedRow.classList.remove('dragging');
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Check if position actually changed
        const currentNextSibling = draggedRow.nextSibling;
        if (currentNextSibling !== originalNextSibling) {
          // Position changed - save the new order
          autoClickBot.saveVariables();
        }
        
        // Reset
        draggedRow = null;
        originalNextSibling = null;
        variableBoundaries = [];
        lastCrossedBoundary = -1;
      };
      
      // Mouse down on handle
      dragHandle.addEventListener('mousedown', (e) => {
        // Don't allow dragging when in editing mode
        if (row.classList.contains('editing')) {
          e.preventDefault();
          return;
        }
        
        isDragging = true;
        draggedRow = row;
        originalNextSibling = row.nextSibling;
        lastCrossedBoundary = -1; // Reset boundary tracking
        
        // Calculate initial boundaries
        updateBoundaries();
        
        // Find which boundary we're starting at
        const allRows = Array.from(autoClickBot.variablesEl.querySelector('.variables-container').querySelectorAll('.variable-list-item'));
        lastCrossedBoundary = allRows.indexOf(draggedRow);
        
        // Add dragging class for visual feedback
        row.classList.add('dragging');
        
        // Add document event listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        e.preventDefault();
        e.stopPropagation();
      });
    }



    createVariableSummary(row) {
      // Preserve any existing statusline before clearing
      const existingStatusline = row.querySelector('.statusline');
      let statuslineClone = null;
      if (existingStatusline) {
        statuslineClone = existingStatusline.cloneNode(true);
      }
      
      row.innerHTML = "";
      const config = row._variableConfig;

      // Drag handle with dots
      const dragHandle = document.createElement("div");
      dragHandle.className = "variable-drag-handle";
      dragHandle.draggable = false; // We use mouse events, not drag events
      // Add middle dot - CSS pseudo-elements create the other two
      const middleDot = document.createElement("div");
      middleDot.className = "dot";
      dragHandle.appendChild(middleDot);
      row.appendChild(dragHandle);

      // Variable info (name and current value in single line)
      const info = document.createElement("div");
      info.className = "variable-info";
      
      const name = document.createElement("div");
      name.className = "variable-name";
      name.textContent = config.name || "Unnamed";
      info.appendChild(name);
      
      const value = document.createElement("div");
      value.className = "variable-value";
      value.textContent = "Value: (not evaluated)";
      info.appendChild(value);
      
      row.appendChild(info);

      // Edit button
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit-btn";
      editBtn.addEventListener("click", () => {
        this.expandVariableForEditing(row);
      });
      row.appendChild(editBtn);
      
      // Restore preserved statusline if it existed
      if (statuslineClone) {
        row.appendChild(statuslineClone);
      }
    }

    expandVariableForEditing(row) {
      const config = row._variableConfig;
      row.classList.add("editing");
      row.innerHTML = "";

      // Summary header with name, current value, and collapse button
      const summary = document.createElement("div");
      summary.className = "variable-summary";
      
      const infoSpan = document.createElement("span");
      infoSpan.className = "variable-summary-info";
      
      const nameSpan = document.createElement("span");
      nameSpan.textContent = config.name || "Unnamed Variable";
      nameSpan.style.fontWeight = "bold";
      infoSpan.appendChild(nameSpan);
      
      const valueSpan = document.createElement("span");
      valueSpan.className = "variable-summary-value";
      const currentValue = this.variableManager.getValue(config.id);
      if (currentValue !== undefined && currentValue !== null) {
        valueSpan.textContent = ` — ${currentValue}`;
      } else {
        valueSpan.textContent = " — (not evaluated)";
      }
      infoSpan.appendChild(valueSpan);
      
      summary.appendChild(infoSpan);

      const collapseBtn = document.createElement("button");
      collapseBtn.textContent = "Done";
      collapseBtn.className = "edit-btn";
      collapseBtn.addEventListener("click", () => {
        this.collapseVariableEditing(row);
      });
      summary.appendChild(collapseBtn);
      row.appendChild(summary);

      // Create editing fields
      const fields = document.createElement("div");
      fields.className = "variable-fields";

      const mkLabel = text => { 
        const d = document.createElement("div"); 
        d.className = "label"; 
        d.textContent = text; 
        return d; 
      };

      // Name field
      fields.appendChild(mkLabel("Name:"));
      const nameI = document.createElement("input");
      nameI.type = "text";
      nameI.className = "var-name";
      nameI.placeholder = "Variable name";
      nameI.value = config.name || "";
      nameI.addEventListener("input", () => {
        config.name = nameI.value;
        this.saveVariables();
        this.updateVariableDisplay(row);
      });
      fields.appendChild(nameI);

      // XPath field
      fields.appendChild(mkLabel("XPath:"));
      const xpI = document.createElement("input");
      xpI.type = "text";
      xpI.className = "var-xpath";
      xpI.placeholder = "XPath — must match exactly one element";
      xpI.value = config.xpath || "";
      xpI.addEventListener("input", () => {
        config.xpath = xpI.value;
        this.saveVariables();
        this.variableManager.evaluateVariable(config.id, this.variablesEl);
      });
      fields.appendChild(xpI);

      // Regex field
      fields.appendChild(mkLabel("Regex:"));
      const regexI = document.createElement("input");
      regexI.type = "text";
      regexI.className = "var-regex";
      regexI.placeholder = "Optional regex to extract value";
      regexI.value = config.regex || "";
      regexI.addEventListener("input", () => {
        config.regex = regexI.value;
        this.saveVariables();
        this.variableManager.evaluateVariable(config.id, this.variablesEl);
      });
      fields.appendChild(regexI);

      // Type field
      fields.appendChild(mkLabel("Type:"));
      const typeS = document.createElement("select");
      typeS.className = "var-type";
      typeS.innerHTML = '<option value="number">Number</option><option value="string">String</option>';
      typeS.value = config.type || "number";
      typeS.addEventListener("change", () => {
        config.type = typeS.value;
        this.saveVariables();
        this.variableManager.evaluateVariable(config.id, this.variablesEl);
      });
      fields.appendChild(typeS);

      // Remove button (below Type field, on right side)
      fields.appendChild(document.createElement("div")); // empty cell
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.className = "remove-btn";
      removeBtn.style.justifySelf = "end";
      removeBtn.addEventListener("click", () => {
        this.removeVariable(config.id);
      });
      fields.appendChild(removeBtn);


      row.appendChild(fields);

      // Focus the name field if it's empty
      if (!config.name) {
        nameI.focus();
      }
    }

    collapseVariableEditing(row) {
      row.classList.remove("editing");
      this.createVariableSummary(row);
      this.setupVariableDragDrop(row);
      this.updateVariableDisplay(row);
    }

    removeVariable(variableId) {
      this.variableManager.values.delete(variableId);
      this.variableManager.cleanupElementObserver(variableId);
      const row = this.variablesEl.querySelector(`[data-variable-id="${variableId}"]`);
      if (row) row.remove();
      this.saveVariables();
    }

    updateVariableCurrentValue(row, newValue) {
      if (!row._variableConfig) return;
      
      const currentValueEl = row.querySelector('.variable-current-value');
      if (currentValueEl) {
        // Only update the current value span, not the whole display
        if (newValue !== undefined && newValue !== null) {
          currentValueEl.textContent = newValue;
        } else {
          currentValueEl.textContent = "(not evaluated)";
        }
      } else {
        // Fallback to full update if structure is missing
        this.updateVariableDisplay(row);
      }

      // Update the summary header if in editing mode  
      if (row.classList.contains('editing')) {
        const summaryValueEl = row.querySelector('.variable-summary-value');
        if (summaryValueEl) {
          if (newValue !== undefined && newValue !== null) {
            summaryValueEl.textContent = ` — ${newValue}`;
          } else {
            summaryValueEl.textContent = " — (not evaluated)";
          }
        }
      }
    }

    updateVariableDisplay(row) {
      if (!row._variableConfig) return;
      
      const nameEl = row.querySelector('.variable-name');
      const valueEl = row.querySelector('.variable-value');
      
      if (nameEl) {
        nameEl.textContent = row._variableConfig.name || "Unnamed";
      }
      
      if (valueEl) {
        const variableId = row.dataset.variableId;
        const currentValue = this.variableManager.getValue(variableId);
        const type = row._variableConfig.type || "number";
        
        // Check if there's an error statusline to display instead
        const statusEl = row.querySelector('.statusline');
        const hasError = statusEl && (statusEl.classList.contains('status-err') || statusEl.classList.contains('status-warn'));
        
        
        if (hasError) {
          valueEl.textContent = statusEl.textContent;
          valueEl.className = "variable-value " + (statusEl.classList.contains('status-err') ? 'status-err' : 'status-warn');
        } else if (currentValue !== undefined && currentValue !== null) {
          valueEl.innerHTML = `<span class="variable-current-value">${currentValue}</span> <span class="variable-type">(${type})</span>`;
          valueEl.className = "variable-value";
        } else {
          valueEl.innerHTML = `<span class="variable-current-value">(not evaluated)</span> <span class="variable-type">(${type})</span>`;
          valueEl.className = "variable-value";
        }
      }

      // Update the summary header if in editing mode  
      if (row.classList.contains('editing')) {
        const summaryInfo = row.querySelector('.variable-summary-info');
        const nameSpan = summaryInfo?.querySelector('span:first-child');
        const valueSpan = summaryInfo?.querySelector('.variable-summary-value');
        
        if (nameSpan) {
          nameSpan.textContent = row._variableConfig.name || "Unnamed Variable";
        }
        
        if (valueSpan) {
          const variableId = row.dataset.variableId;
          const currentValue = this.variableManager.getValue(variableId);
          
          if (currentValue !== undefined && currentValue !== null) {
            valueSpan.textContent = ` — ${currentValue}`;
          } else {
            valueSpan.textContent = " — (not evaluated)";
          }
        }
      }
    }

    // Pill management
    ensurePill(entryId) {
      if (this.pills.has(entryId)) return this.pills.get(entryId);
      const btn = document.createElement("button");
      btn.id = "pill_" + entryId;
      btn.className = "pill";
      btn.addEventListener("click", () => {
        const canRun = this.entryManager.canRun(entryId, this.entriesEl);
        if (!canRun) return;
        if (this.timerManager.isRunning(entryId)) {
          this.timerManager.cancel(entryId);
          this.entryManager.conditionWaiting.delete(entryId);
          this.updatePill(entryId);
        } else {
          this.startTimer(entryId);
        }
      });
      this.pills.set(entryId, btn);
      this.pillRowEl.appendChild(btn);
      this.updatePill(entryId);
      return btn;
    }

    updatePill(entryId) {
      const btn = this.ensurePill(entryId);
      const row = this.getRow(entryId);
      const haveTarget = this.entryManager.canRun(entryId, this.entriesEl);
      const autoOff = this.entryManager.isAutoStopped(entryId);
      const conditionWaiting = this.entryManager.isConditionWaiting(entryId);

      if (autoOff) {
        const name = row ? (this.getText(row, '.name') || "Item") : "Item";
        btn.textContent = `⛔ ${name} (auto-off)`;
      } else if (conditionWaiting) {
        const name = row ? (this.getText(row, '.name') || "Item") : "Item";
        btn.textContent = `⏳ ${name}`;
      } else {
        const name = row ? (this.getText(row, '.name') || "Item") : "Item";
        btn.textContent = `${this.timerManager.isRunning(entryId) ? "⏸" : "▶"} ${name}`;
      }
      btn.classList.toggle("disabled", !haveTarget);
      btn.classList.toggle("running", this.timerManager.isRunning(entryId));
      btn.classList.toggle("autostopped", autoOff);
      btn.classList.toggle("condition-waiting", conditionWaiting);
      btn.style.pointerEvents = haveTarget ? "" : "none";
    }

    removePill(entryId) {
      const btn = this.pills.get(entryId);
      if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
      this.pills.delete(entryId);
    }

    reconcileAll() {
      const desired = new Set();
      Array.from(this.entriesEl.querySelectorAll('.entry')).forEach(row => desired.add(row.dataset.entryId));
      Array.from(this.pills.keys()).forEach(id => {
        if (!desired.has(id)) {
          this.timerManager.cancel(id);
          this.removePill(id);
        }
      });
      desired.forEach(id => { this.ensurePill(id); this.updatePill(id); });
    }

    startTimer(entryId) {
      this.entryManager.startTimer(entryId, this.entriesEl);
      this.updatePill(entryId);
    }

    refreshAllBindings() {
      const rows = Array.from(this.entriesEl.querySelectorAll('.entry'));
      rows.forEach(row => {
        const id = row.dataset.entryId;
        this.entryManager.multiCaches.delete(id);
        this.entryManager.bindEntry(id, this.entriesEl);
      });
      this.reconcileAll();
    }

    // Helper methods
    getRow(entryId) {
      return this.entriesEl.querySelector(`.entry[data-entry-id="${entryId}"]`);
    }

    getText(row, sel) {
      const el = row?.querySelector(sel);
      const v = (el && typeof el.value === 'string') ? el.value : '';
      return v.trim();
    }

    getBool(row, sel) {
      return !!row?.querySelector(sel)?.checked;
    }

    getNum(row, sel, opts = {}) {
      const { min, fallback } = opts || {};
      const el = row?.querySelector(sel);
      let n = parseInt(el?.value, 10);
      if (!Number.isFinite(n)) n = (typeof fallback === 'number' ? fallback : 0);
      if (typeof min === 'number') n = Math.max(min, n);
      return n;
    }

    cleanup() {
      try { this.timerManager.clear(); } catch(_) {}
      try { this.throttleDetector.cleanup(); } catch(_) {}
      try { this.variableManager.cleanup(); } catch(_) {}
      try { this.keyEventInterceptor.cleanup(); } catch(_) {}
      try { this.host.remove(); } catch(_) {}
    }
  }

  // Main initialization function
  function initializeBot() {
    const bot = new AutoClickBot();

    // Expose minimal test hooks when running under tests
    if (AUTOTEST && typeof window !== 'undefined') {
      window.__autoclickTestBotInternals = {
        get root(){ return bot.shadow; },
        get bot(){ return bot; },
      };
    }

    return bot;
  }

  // Initialize the bot
  initializeBot();
})();