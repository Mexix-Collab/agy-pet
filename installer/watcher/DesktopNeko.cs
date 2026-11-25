using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace AgyClaudeStyle.Watcher
{
    internal sealed class NekoTaskItem
    {
        public string Id = "";
        public string ShortTitle = "";
        public string TaskTitle = "";
        public string WindowTitle = "";
        public string WorkState = "idle";
        public bool Running = false;
        public string DoneState = "";
        public string StatusText = "";
        public int Steps = 0;
        public int ElapsedSec = 0;
        public bool HasStage = false;
        public string StageLabel = "";
        public string AgentMode = "single"; // "single" | "multi" | "swarm"
        public int SubagentRunning = 0;
        public int SubagentTotal = 0;
        public List<string> ChildLines = new List<string>();
        public List<string> DetailLines = new List<string>();
    }

    internal sealed class NekoTelemetryState
    {
        public bool Enabled = true;
        public string Pose = "idle";
        public string Mood = "idle";
        public string WorkState = "idle";
        public bool Running = false;
        public string DoneState = "";
        public string StatusText = "";
        public string TaskTitle = "";
        public int Steps = 0;
        public int Calls = 0;
        public int ElapsedSec = 0;
        public int QuotaUsedPct = -1;
        public string QuotaSummary = "";
        public List<string> DetailLines = new List<string>();
        public List<NekoTaskItem> Tasks = new List<NekoTaskItem>();
    }

    internal sealed class DesktopPetPrefs
    {
        public int PetSize = 320;
        public string PetName = "星璃喵";
        public string UserTitle = "老大";
        public string FontFamily = "youyuan";
        public bool ClickSoundEnabled = true;
        public bool SlingshotEnabled = true;
        public string WeatherCity = "";
        public int BestCatchScore = 0;
        public bool AutoPlay = true;
        public bool Fixed = false;
        public bool AllowCrossScreen = true;
        public bool WorkAnimEnabled = true;
        public bool ChatterEnabled = true;
        public bool TaskBubbleEnabled = true;
        public bool TopMost = true;
        public float ThrowPower = 1.0f;
        public float Gravity = 1400f;
        public float Restitution = 0.78f;
        public float Friction = 2.5f;
        public bool DragSpring = true;
        public bool CeilingBounce = true;
        public bool AutoCheckUpdates = true;
        public string LastUpdateCheckDate = "";
        public int? SavedX = null;
        public int? SavedY = null;

        public void ResetPhysicsDefaults()
        {
            ThrowPower = 1.0f;
            Gravity = 1400f;
            Restitution = 0.78f;
            Friction = 2.5f;
            DragSpring = true;
            CeilingBounce = true;
        }

        public static DesktopPetPrefs Load(string baseDir)
        {
            DesktopPetPrefs prefs = new DesktopPetPrefs();
            try
            {
                string path = Path.Combine(baseDir, "desktop-pet.json");
                if (!File.Exists(path)) return prefs;
                Dictionary<string, object> raw = MiniJson.ParseObject(File.ReadAllText(path, Encoding.UTF8));
                if (raw.ContainsKey("petSize"))
                {
                    int sz = Convert.ToInt32(raw["petSize"]);
                    if (sz >= 200 && sz <= 480) prefs.PetSize = sz;
                }
                if (raw.ContainsKey("petName") && raw["petName"] != null)
                {
                    string nm = Convert.ToString(raw["petName"]).Trim();
                    if (!string.IsNullOrEmpty(nm) && nm.Length <= 24) prefs.PetName = nm;
                }
                if (raw.ContainsKey("userTitle") && raw["userTitle"] != null)
                {
                    string ut = Convert.ToString(raw["userTitle"]).Trim();
                    if (!string.IsNullOrEmpty(ut) && ut.Length <= 16) prefs.UserTitle = ut;
                }
                if (raw.ContainsKey("fontFamily") && raw["fontFamily"] != null)
                {
                    string ff = Convert.ToString(raw["fontFamily"]).Trim().ToLowerInvariant();
                    if (ff == "candy") ff = "youyuan";
                    if (ff == "youyuan" || ff == "yahei" || ff == "kaiti" || ff == "comic") prefs.FontFamily = ff;
                }
                if (raw.ContainsKey("clickSoundEnabled")) prefs.ClickSoundEnabled = !Equals(raw["clickSoundEnabled"], false);
                if (raw.ContainsKey("slingshotEnabled")) prefs.SlingshotEnabled = !Equals(raw["slingshotEnabled"], false);
                if (raw.ContainsKey("weatherCity") && raw["weatherCity"] != null)
                {
                    prefs.WeatherCity = Convert.ToString(raw["weatherCity"]).Trim();
                }
                if (raw.ContainsKey("bestCatchScore") && raw["bestCatchScore"] != null)
                {
                    int bs = Convert.ToInt32(raw["bestCatchScore"]);
                    if (bs >= 0 && bs < 1000000) prefs.BestCatchScore = bs;
                }
                if (raw.ContainsKey("autoPlay")) prefs.AutoPlay = !Equals(raw["autoPlay"], false);
                if (raw.ContainsKey("fixed")) prefs.Fixed = Equals(raw["fixed"], true);
                if (raw.ContainsKey("allowCrossScreen")) prefs.AllowCrossScreen = !Equals(raw["allowCrossScreen"], false);
                if (raw.ContainsKey("workAnimEnabled")) prefs.WorkAnimEnabled = !Equals(raw["workAnimEnabled"], false);
                if (raw.ContainsKey("chatterEnabled")) prefs.ChatterEnabled = !Equals(raw["chatterEnabled"], false);
                if (raw.ContainsKey("taskBubbleEnabled")) prefs.TaskBubbleEnabled = !Equals(raw["taskBubbleEnabled"], false);
                if (raw.ContainsKey("topMost")) prefs.TopMost = !Equals(raw["topMost"], false);
                if (raw.ContainsKey("throwPower") && raw["throwPower"] != null)
                {
                    float v = Convert.ToSingle(raw["throwPower"]);
                    if (v >= 0.2f && v <= 3.0f) prefs.ThrowPower = v;
                }
                if (raw.ContainsKey("gravity") && raw["gravity"] != null)
                {
                    float v = Convert.ToSingle(raw["gravity"]);
                    if (v >= 0f && v <= 4000f) prefs.Gravity = v;
                }
                if (raw.ContainsKey("restitution") && raw["restitution"] != null)
                {
                    float v = Convert.ToSingle(raw["restitution"]);
                    if (v >= 0f && v <= 0.99f) prefs.Restitution = v;
                }
                if (raw.ContainsKey("friction") && raw["friction"] != null)
                {
                    float v = Convert.ToSingle(raw["friction"]);
                    if (v >= 0f && v <= 15f) prefs.Friction = v;
                }
                if (raw.ContainsKey("dragSpring")) prefs.DragSpring = !Equals(raw["dragSpring"], false);
                if (raw.ContainsKey("ceilingBounce")) prefs.CeilingBounce = !Equals(raw["ceilingBounce"], false);
                if (raw.ContainsKey("autoCheckUpdates")) prefs.AutoCheckUpdates = !Equals(raw["autoCheckUpdates"], false);
                if (raw.ContainsKey("lastUpdateCheckDate") && raw["lastUpdateCheckDate"] != null)
                {
                    prefs.LastUpdateCheckDate = Convert.ToString(raw["lastUpdateCheckDate"]).Trim();
                }
                if (raw.ContainsKey("savedX") && raw["savedX"] != null) prefs.SavedX = Convert.ToInt32(raw["savedX"]);
                if (raw.ContainsKey("savedY") && raw["savedY"] != null) prefs.SavedY = Convert.ToInt32(raw["savedY"]);
            }
            catch { }
            return prefs;
        }

        public void Save(string baseDir)
        {
            try
            {
                string path = Path.Combine(baseDir, "desktop-pet.json");
                Dictionary<string, object> obj = new Dictionary<string, object>(StringComparer.Ordinal);
                obj["petSize"] = PetSize;
                obj["petName"] = PetName;
                obj["userTitle"] = string.IsNullOrWhiteSpace(UserTitle) ? "老大" : UserTitle;
                obj["fontFamily"] = FontFamily;
                obj["clickSoundEnabled"] = ClickSoundEnabled;
                obj["slingshotEnabled"] = SlingshotEnabled;
                obj["weatherCity"] = WeatherCity ?? "";
                obj["bestCatchScore"] = BestCatchScore;
                obj["autoPlay"] = AutoPlay;
                obj["fixed"] = Fixed;
                obj["allowCrossScreen"] = AllowCrossScreen;
                obj["workAnimEnabled"] = WorkAnimEnabled;
                obj["chatterEnabled"] = ChatterEnabled;
                obj["taskBubbleEnabled"] = TaskBubbleEnabled;
                obj["topMost"] = TopMost;
                obj["throwPower"] = Math.Round(ThrowPower, 2);
                obj["gravity"] = Math.Round(Gravity, 1);
                obj["restitution"] = Math.Round(Restitution, 2);
                obj["friction"] = Math.Round(Friction, 2);
                obj["dragSpring"] = DragSpring;
                obj["ceilingBounce"] = CeilingBounce;
                obj["autoCheckUpdates"] = AutoCheckUpdates;
                obj["lastUpdateCheckDate"] = LastUpdateCheckDate ?? "";
                if (SavedX.HasValue) obj["savedX"] = SavedX.Value;
                if (SavedY.HasValue) obj["savedY"] = SavedY.Value;
                File.WriteAllText(path, MiniJson.Stringify(obj, true) + "\n", new UTF8Encoding(false));
            }
            catch { }
        }
    }

    internal static class NativePetWin32
    {
        public const int GWL_EXSTYLE = -20;
        public const int WS_EX_TRANSPARENT = 0x00000020;
        public const int WS_EX_TOOLWINDOW = 0x00000080;
        public const int WS_EX_TOPMOST = 0x00000008;
        public const int WS_EX_LAYERED = 0x00080000;
        public const int WS_EX_NOACTIVATE = 0x08000000;
        public const int WS_EX_NOREDIRECTIONBITMAP = 0x00200000;
        public const uint LWA_ALPHA = 0x00000002;

        public const int WM_MOUSEACTIVATE = 0x0021;
        public const int MA_NOACTIVATE = 3;

        public static readonly IntPtr HWND_TOP = IntPtr.Zero;
        public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
        public static readonly IntPtr HWND_NOTOPMOST = new IntPtr(-2);
        public const uint SWP_NOSIZE = 0x0001;
        public const uint SWP_NOMOVE = 0x0002;
        public const uint SWP_NOZORDER = 0x0004;
        public const uint SWP_NOACTIVATE = 0x0010;
        public const uint SWP_SHOWWINDOW = 0x0040;
        public const uint SWP_NOOWNERZORDER = 0x0200;
        public const uint SWP_NOSENDCHANGING = 0x0400;
        public const int SW_SHOW = 5;
        public const int SW_RESTORE = 9;
        public const int ASFW_ANY = -1;
        public const byte VK_MENU = 0x12;
        public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        public const uint KEYEVENTF_KEYUP = 0x0002;

        public const int MOUSE_MOVE = 0x200;
        public const int MOUSE_LDOWN = 0x201;
        public const int MOUSE_LUP = 0x202;
        public const int MOUSE_LEAVE = 0x2A3;

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT { public int Left, Top, Right, Bottom; }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT { public int X, Y; }

        [StructLayout(LayoutKind.Sequential)]
        public struct COREWEBVIEW2_COLOR { public byte A, R, G, B; }

        [DllImport("user32.dll")]
        public static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        [DllImport("user32.dll")]
        public static extern uint GetDpiForWindow(IntPtr hwnd);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetLayeredWindowAttributes(IntPtr hwnd, uint crKey, byte bAlpha, uint dwFlags);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("user32.dll")]
        public static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        public static extern bool BringWindowToTop(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool AllowSetForegroundWindow(int dwProcessId);

        [DllImport("user32.dll")]
        public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

        [DllImport("kernel32.dll")]
        public static extern uint GetCurrentThreadId();

        [DllImport("user32.dll")]
        public static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

        [DllImport("user32.dll")]
        public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        public static extern bool IsIconic(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern bool IsWindowVisible(IntPtr hWnd);

        [DllImport("user32.dll")]
        public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

        public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

        [DllImport("user32.dll")]
        public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("dcomp.dll")]
        public static extern int DCompositionCreateDevice(IntPtr dxgiDevice, ref Guid iid, out IDCompositionDevice dcompDevice);

        [DllImport("dwmapi.dll")]
        public static extern int DwmFlush();

        [DllImport("WebView2Loader.dll", CharSet = CharSet.Unicode)]
        public static extern int CreateCoreWebView2EnvironmentWithOptions(
            string browserExecutableFolder,
            string userDataFolder,
            IntPtr environmentOptions,
            ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler environmentCreatedHandler);

        public static void EnsurePerMonitorDpi()
        {
            try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }
        }

        public static float GetDpiScale(IntPtr hwnd)
        {
            try
            {
                uint dpi = GetDpiForWindow(hwnd);
                if (dpi >= 96 && dpi <= 480) return dpi / 96f;
            }
            catch { }
            return 1.0f;
        }

        [DllImport("user32.dll")]
        public static extern short GetAsyncKeyState(int vKey);

        public static void ApplyClickThrough(IntPtr hwnd, bool clickThrough)
        {
            if (hwnd == IntPtr.Zero) return;
            // IMPORTANT: Never add WS_EX_LAYERED onto a WS_EX_NOREDIRECTIONBITMAP DirectComposition window,
            // or DWM treats its layered alpha as 0 and turns the entire WebView2 visual invisible!
            // Blank-area click-through is handled natively by Form.Region cutout (ApplyWindowRegionFromHits).
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            int next = clickThrough ? (ex | WS_EX_TRANSPARENT) : (ex & ~WS_EX_TRANSPARENT);
            next &= ~WS_EX_LAYERED;
            if (next != ex)
            {
                SetWindowLong(hwnd, GWL_EXSTYLE, next);
            }
        }

        public static void SetNoActivate(IntPtr hwnd, bool noActivate)
        {
            if (hwnd == IntPtr.Zero) return;
            int ex = GetWindowLong(hwnd, GWL_EXSTYLE);
            int next = noActivate ? (ex | WS_EX_NOACTIVATE) : (ex & ~WS_EX_NOACTIVATE);
            next &= ~WS_EX_LAYERED;
            if (next != ex)
            {
                SetWindowLong(hwnd, GWL_EXSTYLE, next);
            }
        }

        public static void AssertTopMost(IntPtr hwnd, bool topMost)
        {
            if (hwnd == IntPtr.Zero) return;
            SetWindowPos(
                hwnd,
                topMost ? HWND_TOPMOST : HWND_NOTOPMOST,
                0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_NOOWNERZORDER);
        }

        private static long _lastLaunchTicks = 0;

        public static IntPtr FindAntigravityWindow(string preferredTitle = null, string taskTitle = null, bool allowHidden = true)
        {
            Process[] procs = Process.GetProcessesByName("Antigravity");
            HashSet<uint> agyPids = new HashSet<uint>();
            IntPtr fallbackHwnd = IntPtr.Zero;
            IntPtr matchedHwnd = IntPtr.Zero;
            for (int i = 0; i < procs.Length; i++)
            {
                try
                {
                    agyPids.Add((uint)procs[i].Id);
                    IntPtr hwnd = procs[i].MainWindowHandle;
                    if (hwnd != IntPtr.Zero && IsWindow(hwnd))
                    {
                        if (fallbackHwnd == IntPtr.Zero) fallbackHwnd = hwnd;
                        string wt = procs[i].MainWindowTitle ?? "";
                        if (!string.IsNullOrEmpty(preferredTitle) && wt.IndexOf(preferredTitle, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            matchedHwnd = hwnd;
                        }
                        else if (matchedHwnd == IntPtr.Zero && !string.IsNullOrEmpty(taskTitle) && wt.IndexOf(taskTitle, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            matchedHwnd = hwnd;
                        }
                    }
                }
                catch { }
                finally
                {
                    try { procs[i].Dispose(); } catch { }
                }
            }

            // Also scan top-level Chrome_WidgetWin_1 windows belonging to Antigravity (including minimized/multi-window)
            IntPtr hiddenCandidate = IntPtr.Zero;
            if (agyPids.Count > 0 && matchedHwnd == IntPtr.Zero)
            {
                EnumWindows((hWnd, lParam) =>
                {
                    uint pid;
                    GetWindowThreadProcessId(hWnd, out pid);
                    if (!agyPids.Contains(pid)) return true;
                    StringBuilder clsSb = new StringBuilder(64);
                    GetClassName(hWnd, clsSb, clsSb.Capacity);
                    string cls = clsSb.ToString();
                    if (!string.Equals(cls, "Chrome_WidgetWin_1", StringComparison.Ordinal)) return true;
                    StringBuilder titleSb = new StringBuilder(256);
                    GetWindowText(hWnd, titleSb, titleSb.Capacity);
                    string title = titleSb.ToString();
                    if (string.IsNullOrEmpty(title)) return true;
                    bool vis = IsWindowVisible(hWnd);
                    if (vis)
                    {
                        if (fallbackHwnd == IntPtr.Zero) fallbackHwnd = hWnd;
                        if (!string.IsNullOrEmpty(preferredTitle) && title.IndexOf(preferredTitle, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            matchedHwnd = hWnd;
                            return false;
                        }
                        if (!string.IsNullOrEmpty(taskTitle) && title.IndexOf(taskTitle, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            matchedHwnd = hWnd;
                            return false;
                        }
                    }
                    else if (allowHidden && hiddenCandidate == IntPtr.Zero && title.IndexOf("Antigravity", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        RECT rect;
                        if (GetWindowRect(hWnd, out rect) && (rect.Right - rect.Left) >= 160 && (rect.Bottom - rect.Top) >= 120)
                        {
                            hiddenCandidate = hWnd;
                        }
                    }
                    return true;
                }, IntPtr.Zero);
            }

            if (matchedHwnd != IntPtr.Zero) return matchedHwnd;
            if (fallbackHwnd != IntPtr.Zero) return fallbackHwnd;
            return allowHidden ? hiddenCandidate : IntPtr.Zero;
        }

        public static bool ForceForegroundWindow(IntPtr target)
        {
            if (target == IntPtr.Zero || !IsWindow(target)) return false;
            try { AllowSetForegroundWindow(ASFW_ANY); } catch { }
            if (!IsWindowVisible(target)) ShowWindow(target, SW_SHOW);
            if (IsIconic(target)) ShowWindow(target, SW_RESTORE);

            IntPtr fg = GetForegroundWindow();
            if (fg == target) return true;

            uint curTid = GetCurrentThreadId();
            uint ignoredPid;
            uint fgTid = fg != IntPtr.Zero ? GetWindowThreadProcessId(fg, out ignoredPid) : 0;
            uint targetTid = GetWindowThreadProcessId(target, out ignoredPid);

            bool attachedFg = false;
            bool attachedTarget = false;
            try
            {
                if (fgTid != 0 && fgTid != curTid)
                {
                    attachedFg = AttachThreadInput(curTid, fgTid, true);
                }
                if (targetTid != 0 && targetTid != curTid && targetTid != fgTid)
                {
                    attachedTarget = AttachThreadInput(curTid, targetTid, true);
                }
                BringWindowToTop(target);
                SetWindowPos(target, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
                SetForegroundWindow(target);
            }
            finally
            {
                if (attachedTarget) AttachThreadInput(curTid, targetTid, false);
                if (attachedFg) AttachThreadInput(curTid, fgTid, false);
            }

            if (GetForegroundWindow() != target)
            {
                // WebViewPetForm uses WS_EX_NOACTIVATE, so Windows may lock foreground changes until an Alt edge unlocks it.
                try
                {
                    keybd_event(VK_MENU, 0x45, KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
                    keybd_event(VK_MENU, 0x45, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, UIntPtr.Zero);
                    BringWindowToTop(target);
                    SetWindowPos(target, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW);
                    SetForegroundWindow(target);
                }
                catch { }
            }
            return GetForegroundWindow() == target;
        }

        public static void BringAntigravityToFront(string preferredTitle = null, string taskTitle = null)
        {
            try
            {
                // Never force-show hidden Chromium splash/helper HWNDs (allowHidden: false)
                IntPtr target = FindAntigravityWindow(preferredTitle, taskTitle, false);
                if (target != IntPtr.Zero)
                {
                    ForceForegroundWindow(target);
                    return;
                }

                // Antigravity main window was closed to background/tray (no visible top-level window handle exists).
                // Allow the spawned instance to take foreground and wake the single-instance app cleanly.
                long nowTicks = DateTime.UtcNow.Ticks;
                long prevTicks = Interlocked.Read(ref _lastLaunchTicks);
                if (nowTicks - prevTicks < TimeSpan.FromMilliseconds(2200).Ticks)
                {
                    return;
                }
                Interlocked.Exchange(ref _lastLaunchTicks, nowTicks);

                try { AllowSetForegroundWindow(ASFW_ANY); } catch { }
                bool agyRunning = CdpHelper.GetAntigravityProcessIds().Count > 0;
                bool hasCdp = CdpHelper.ReadPort(null).HasValue;
                bool launched = (agyRunning && hasCdp)
                    ? CdpHelper.WakeExistingAntigravityWindow(null)
                    : CdpHelper.LaunchAntigravityWithCdp(null, 0);
                if (!launched) return;

                ThreadPool.QueueUserWorkItem((_) =>
                {
                    try
                    {
                        for (int attempt = 0; attempt < 45; attempt++)
                        {
                            Thread.Sleep(180);
                            IntPtr appeared = FindAntigravityWindow(preferredTitle, taskTitle, false);
                            if (appeared != IntPtr.Zero)
                            {
                                ForceForegroundWindow(appeared);
                                break;
                            }
                        }
                    }
                    catch { }
                });
            }
            catch { }
        }
    }

    // ── DirectComposition & WebView2 Minimal COM Interop (verified vtable slots, zero NuGet bloat) ──
    [ComImport, Guid("C37EA93A-E7AA-450D-B16F-9746CB0407F3"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IDCompositionDevice
    {
        [PreserveSig] int Commit();
        [PreserveSig] int WaitForCommitCompletion();
        [PreserveSig] int GetFrameStatistics(IntPtr statistics);
        [PreserveSig] int CreateTargetForHwnd(IntPtr hwnd, [MarshalAs(UnmanagedType.Bool)] bool topmost, out IDCompositionTarget target);
        [PreserveSig] int CreateVisual(out IDCompositionVisual visual);
    }

    [ComImport, Guid("eacdd04c-117e-4e17-88f4-d1b12b0e3d89"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IDCompositionTarget
    {
        [PreserveSig] int SetRoot(IDCompositionVisual visual);
    }

    [ComImport, Guid("4d93059d-097b-4651-9a60-f0f25116e2f3"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IDCompositionVisual { }

    [ComImport, Guid("4e8a3389-c9d8-4bd2-b6b5-124fee6cc14d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler
    {
        [PreserveSig] int Invoke(int result, ICoreWebView2Environment createdEnvironment);
    }

    [ComImport, Guid("02fab84b-1428-4fb7-ad45-1b2e64736184"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2CreateCoreWebView2CompositionControllerCompletedHandler
    {
        [PreserveSig] int Invoke(int result, ICoreWebView2CompositionController webView);
    }

    [ComImport, Guid("57213f19-00e6-49fa-8e07-898ea01ecbd2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2WebMessageReceivedEventHandler
    {
        [PreserveSig] int Invoke(ICoreWebView2 sender, ICoreWebView2WebMessageReceivedEventArgs args);
    }

    [ComImport, Guid("0f99a40c-e962-4207-9e92-e3d542eff849"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2WebMessageReceivedEventArgs
    {
        [PreserveSig] int get_Source([MarshalAs(UnmanagedType.LPWStr)] out string source);
        [PreserveSig] int get_WebMessageAsJson([MarshalAs(UnmanagedType.LPWStr)] out string webMessageAsJson);
        [PreserveSig] int TryGetWebMessageAsString([MarshalAs(UnmanagedType.LPWStr)] out string webMessageAsString);
    }

    [ComImport, Guid("b96d755e-0319-4e92-a296-23436f46a1fc"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2Environment
    {
        [PreserveSig] int CreateCoreWebView2Controller(IntPtr parentWindow, IntPtr handler);
        [PreserveSig] int CreateWebResourceResponse(IntPtr content, int statusCode, [MarshalAs(UnmanagedType.LPWStr)] string reasonPhrase, [MarshalAs(UnmanagedType.LPWStr)] string headers, out IntPtr response);
        [PreserveSig] int get_BrowserVersionString([MarshalAs(UnmanagedType.LPWStr)] out string versionInfo);
        [PreserveSig] int add_NewBrowserVersionAvailable(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_NewBrowserVersionAvailable(long token);
    }

    [ComImport, Guid("80a22ae3-be7c-4ce2-afe1-5a50056cdeeb"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2Environment3 : ICoreWebView2Environment
    {
        new int CreateCoreWebView2Controller(IntPtr parentWindow, IntPtr handler);
        new int CreateWebResourceResponse(IntPtr content, int statusCode, [MarshalAs(UnmanagedType.LPWStr)] string reasonPhrase, [MarshalAs(UnmanagedType.LPWStr)] string headers, out IntPtr response);
        new int get_BrowserVersionString([MarshalAs(UnmanagedType.LPWStr)] out string versionInfo);
        new int add_NewBrowserVersionAvailable(IntPtr eventHandler, out long token);
        new int remove_NewBrowserVersionAvailable(long token);
        [PreserveSig] int CreateWebResourceRequest([MarshalAs(UnmanagedType.LPWStr)] string uri, [MarshalAs(UnmanagedType.LPWStr)] string method, IntPtr postData, [MarshalAs(UnmanagedType.LPWStr)] string headers, out IntPtr request);
        [PreserveSig] int CreateCoreWebView2CompositionController(IntPtr parentWindow, ICoreWebView2CreateCoreWebView2CompositionControllerCompletedHandler handler);
        [PreserveSig] int CreateCoreWebView2PointerInfo(out IntPtr pointerInfo);
    }

    [ComImport, Guid("3df9b733-b9ae-4a15-86b4-eb9ee9826469"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2CompositionController
    {
        [PreserveSig] int get_RootVisualTarget([MarshalAs(UnmanagedType.IUnknown)] out object target);
        [PreserveSig] int put_RootVisualTarget([MarshalAs(UnmanagedType.IUnknown)] object target);
        [PreserveSig] int SendMouseInput(int eventKind, int virtualKeys, uint mouseData, NativePetWin32.POINT point);
    }

    [ComImport, Guid("c979903e-d4ca-4228-92eb-47ee3fa96eab"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2Controller2
    {
        [PreserveSig] int get_IsVisible(out int isVisible);
        [PreserveSig] int put_IsVisible(int isVisible);
        [PreserveSig] int get_Bounds(out NativePetWin32.RECT bounds);
        [PreserveSig] int put_Bounds(NativePetWin32.RECT bounds);
        [PreserveSig] int get_ZoomFactor(out double zoomFactor);
        [PreserveSig] int put_ZoomFactor(double zoomFactor);
        [PreserveSig] int add_ZoomFactorChanged(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_ZoomFactorChanged(long token);
        [PreserveSig] int SetBoundsAndZoomFactor(NativePetWin32.RECT bounds, double zoomFactor);
        [PreserveSig] int MoveFocus(int reason);
        [PreserveSig] int add_MoveFocusRequested(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_MoveFocusRequested(long token);
        [PreserveSig] int add_GotFocus(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_GotFocus(long token);
        [PreserveSig] int add_LostFocus(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_LostFocus(long token);
        [PreserveSig] int add_AcceleratorKeyPressed(IntPtr eventHandler, out long token);
        [PreserveSig] int remove_AcceleratorKeyPressed(long token);
        [PreserveSig] int get_ParentWindow(out IntPtr parentWindow);
        [PreserveSig] int put_ParentWindow(IntPtr parentWindow);
        [PreserveSig] int NotifyParentWindowPositionChanged();
        [PreserveSig] int Close();
        [PreserveSig] int get_CoreWebView2(out ICoreWebView2 coreWebView2);
        [PreserveSig] int get_DefaultBackgroundColor(out NativePetWin32.COREWEBVIEW2_COLOR backgroundColor);
        [PreserveSig] int put_DefaultBackgroundColor(NativePetWin32.COREWEBVIEW2_COLOR backgroundColor);
    }

    [ComImport, Guid("76eceacb-0462-4d94-ac83-423a6793775e"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ICoreWebView2
    {
        [PreserveSig] int get_Settings(out IntPtr settings);
        [PreserveSig] int get_Source([MarshalAs(UnmanagedType.LPWStr)] out string uri);
        [PreserveSig] int Navigate([MarshalAs(UnmanagedType.LPWStr)] string uri);
        [PreserveSig] int NavigateToString([MarshalAs(UnmanagedType.LPWStr)] string htmlContent);
        [PreserveSig] int add_NavigationStarting(IntPtr h, out long token);
        [PreserveSig] int remove_NavigationStarting(long token);
        [PreserveSig] int add_ContentLoading(IntPtr h, out long token);
        [PreserveSig] int remove_ContentLoading(long token);
        [PreserveSig] int add_SourceChanged(IntPtr h, out long token);
        [PreserveSig] int remove_SourceChanged(long token);
        [PreserveSig] int add_HistoryChanged(IntPtr h, out long token);
        [PreserveSig] int remove_HistoryChanged(long token);
        [PreserveSig] int add_NavigationCompleted(IntPtr h, out long token);
        [PreserveSig] int remove_NavigationCompleted(long token);
        [PreserveSig] int add_FrameNavigationStarting(IntPtr h, out long token);
        [PreserveSig] int remove_FrameNavigationStarting(long token);
        [PreserveSig] int add_FrameNavigationCompleted(IntPtr h, out long token);
        [PreserveSig] int remove_FrameNavigationCompleted(long token);
        [PreserveSig] int add_ScriptDialogOpening(IntPtr h, out long token);
        [PreserveSig] int remove_ScriptDialogOpening(long token);
        [PreserveSig] int add_PermissionRequested(IntPtr h, out long token);
        [PreserveSig] int remove_PermissionRequested(long token);
        [PreserveSig] int add_ProcessFailed(IntPtr h, out long token);
        [PreserveSig] int remove_ProcessFailed(long token);
        [PreserveSig] int AddScriptToExecuteOnDocumentCreated([MarshalAs(UnmanagedType.LPWStr)] string js, IntPtr handler);
        [PreserveSig] int RemoveScriptToExecuteOnDocumentCreated([MarshalAs(UnmanagedType.LPWStr)] string id);
        [PreserveSig] int ExecuteScript([MarshalAs(UnmanagedType.LPWStr)] string javaScript, IntPtr handler);
        [PreserveSig] int CapturePreview(int imageFormat, IntPtr imageStream, IntPtr handler);
        [PreserveSig] int Reload();
        [PreserveSig] int PostWebMessageAsJson([MarshalAs(UnmanagedType.LPWStr)] string webMessageAsJson);
        [PreserveSig] int PostWebMessageAsString([MarshalAs(UnmanagedType.LPWStr)] string webMessageAsString);
        [PreserveSig] int add_WebMessageReceived(ICoreWebView2WebMessageReceivedEventHandler handler, out long token);
        [PreserveSig] int remove_WebMessageReceived(long token);
    }

    internal sealed class Wv2EnvHandler : ICoreWebView2CreateCoreWebView2EnvironmentCompletedHandler
    {
        private readonly Action<int, ICoreWebView2Environment> _cb;
        public Wv2EnvHandler(Action<int, ICoreWebView2Environment> cb) { _cb = cb; }
        public int Invoke(int result, ICoreWebView2Environment env) { _cb(result, env); return 0; }
    }

    internal sealed class Wv2CompHandler : ICoreWebView2CreateCoreWebView2CompositionControllerCompletedHandler
    {
        private readonly Action<int, ICoreWebView2CompositionController> _cb;
        public Wv2CompHandler(Action<int, ICoreWebView2CompositionController> cb) { _cb = cb; }
        public int Invoke(int result, ICoreWebView2CompositionController comp) { _cb(result, comp); return 0; }
    }

    internal sealed class Wv2MsgHandler : ICoreWebView2WebMessageReceivedEventHandler
    {
        private readonly Action<string> _cb;
        public Wv2MsgHandler(Action<string> cb) { _cb = cb; }
        public int Invoke(ICoreWebView2 sender, ICoreWebView2WebMessageReceivedEventArgs args)
        {
            try
            {
                string json;
                if (args != null && args.get_WebMessageAsJson(out json) == 0 && !string.IsNullOrEmpty(json))
                {
                    _cb(json);
                }
            }
            catch { }
            return 0;
        }
    }

    // ── Local lightweight HTTP asset server for WebView2 (<video> VP9 Alpha WebM + pet-ui.html) ──
    internal sealed class PetAssetServer : IDisposable
    {
        private readonly string _baseDir;
        private readonly string _webmDir;
        private readonly string _memesJson;
        private readonly HttpListener _listener;
        private readonly Thread _thread;
        private volatile bool _stopped = false;
        public int Port { get; private set; }
        public string WebmDir { get { return _webmDir; } }

        public PetAssetServer(string baseDir)
        {
            _baseDir = baseDir;
            _webmDir = Path.Combine(baseDir, "anims", "webm");
            _assetsDir = Path.Combine(baseDir, "assets");
            _todosPath = Path.Combine(baseDir, "pet-todos.json");
            _memesJson = ExtractMemesJson(baseDir);
            Port = PickFreePort();
            _listener = new HttpListener();
            _listener.Prefixes.Add("http://127.0.0.1:" + Port + "/");
            _listener.Start();
            _thread = new Thread(ServeLoop);
            _thread.IsBackground = true;
            _thread.Start();
        }

        private static int PickFreePort()
        {
            TcpListener tl = new TcpListener(IPAddress.Loopback, 0);
            tl.Start();
            int p = ((IPEndPoint)tl.LocalEndpoint).Port;
            tl.Stop();
            return p;
        }

        private static string ExtractMemesJson(string baseDir)
        {
            try
            {
                string jsPath = Path.Combine(baseDir, "crab-assets.js");
                if (!File.Exists(jsPath)) return "{}";
                string text = File.ReadAllText(jsPath, Encoding.UTF8);
                const string marker = "const NEKO_MEMES = ";
                int idx = text.IndexOf(marker, StringComparison.Ordinal);
                if (idx < 0) return "{}";
                int start = idx + marker.Length;
                int endLf = text.IndexOf(";\n", start, StringComparison.Ordinal);
                int endCrlf = text.IndexOf(";\r\n", start, StringComparison.Ordinal);
                int end = -1;
                if (endLf >= 0 && endCrlf >= 0) end = Math.Min(endLf, endCrlf);
                else end = Math.Max(endLf, endCrlf);
                if (end < 0) return "{}";
                return text.Substring(start, end - start).Trim();
            }
            catch
            {
                return "{}";
            }
        }

        public List<string> ListWebmNames()
        {
            List<string> list = new List<string>();
            try
            {
                if (!Directory.Exists(_webmDir)) return list;
                string[] files = Directory.GetFiles(_webmDir, "*.webm");
                Array.Sort(files, StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < files.Length; i++)
                {
                    list.Add(Path.GetFileNameWithoutExtension(files[i]));
                }
            }
            catch { }
            return list;
        }

        private void ServeLoop()
        {
            while (!_stopped && _listener.IsListening)
            {
                HttpListenerContext ctx = null;
                try { ctx = _listener.GetContext(); }
                catch { break; }
                ThreadPool.QueueUserWorkItem(_ => HandleRequest(ctx));
            }
        }

        private readonly string _assetsDir;
        private readonly string _todosPath;
        private readonly object _weatherLock = new object();
        private string _cachedWeatherJson = "";
        private string _cachedWeatherKey = "";
        private DateTime _cachedWeatherUtc = DateTime.MinValue;

        private static string FetchUrlUtf8(string url, int timeoutMs = 9000)
        {
            try
            {
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)12288 | (SecurityProtocolType)3072 | (SecurityProtocolType)768 | SecurityProtocolType.Tls;
            }
            catch
            {
                try { ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; } catch { }
            }
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "GET";
            req.Timeout = timeoutMs;
            req.ReadWriteTimeout = timeoutMs;
            req.UserAgent = "AGY-Desktop-Pet/2.1";
            using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
            using (Stream st = resp.GetResponseStream())
            using (StreamReader sr = new StreamReader(st, Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        private static void DescribeWmoCode(int code, out string summary, out string icon, out string tip)
        {
            if (code == 0) { summary = "晴朗"; icon = "sun"; tip = "阳光正好，适合开心写代码♪"; return; }
            if (code == 1 || code == 2) { summary = "少云"; icon = "partly"; tip = "微风和煦，今天状态稳稳的✦"; return; }
            if (code == 3) { summary = "阴天"; icon = "cloud"; tip = "天色有点阴，室内灯光调柔和些护眼哦~"; return; }
            if (code == 45 || code == 48) { summary = "有雾"; icon = "fog"; tip = "外面雾蒙蒙的，出门注意安全呀~"; return; }
            if (code >= 51 && code <= 57) { summary = "毛毛雨"; icon = "rain"; tip = "在下毛毛雨啦，出门记得顺手带把伞☂"; return; }
            if (code >= 61 && code <= 67) { summary = code >= 65 ? "大雨" : "小到中雨"; icon = "rain"; tip = "外面在下雨喵！出门千万别忘带伞☂"; return; }
            if (code >= 71 && code <= 77) { summary = "降雪"; icon = "snow"; tip = "下雪啦❄️ 注意保暖多穿点衣服哦~"; return; }
            if (code >= 80 && code <= 82) { summary = "阵雨"; icon = "rain"; tip = "有阵雨出没，带把折叠伞更安心☂"; return; }
            if (code >= 85 && code <= 86) { summary = "阵雪"; icon = "snow"; tip = "冷嗖嗖的阵雪天气，来杯热茶暖暖身☕"; return; }
            if (code >= 95) { summary = "雷阵雨"; icon = "storm"; tip = "打雷下雨啦⚡ 记得关窗安心待在室内~"; return; }
            summary = "多云"; icon = "cloud"; tip = "天气平稳，专心肝代码喵~";
        }

        private string QueryWeatherJson(string preferredCity, bool force)
        {
            string key = (preferredCity ?? "").Trim();
            lock (_weatherLock)
            {
                if (!force && !string.IsNullOrEmpty(_cachedWeatherJson) &&
                    string.Equals(_cachedWeatherKey, key, StringComparison.OrdinalIgnoreCase) &&
                    (DateTime.UtcNow - _cachedWeatherUtc).TotalMinutes < 45)
                {
                    return _cachedWeatherJson;
                }
            }

            try
            {
                string cityName = key;
                double lat = double.NaN;
                double lon = double.NaN;
                bool approxByIp = false;

                if (!string.IsNullOrEmpty(cityName))
                {
                    string[] tries = cityName.EndsWith("市") && cityName.Length > 2
                        ? new string[] { cityName, cityName.Substring(0, cityName.Length - 1) }
                        : new string[] { cityName, cityName + "市" };
                    for (int i = 0; i < tries.Length && double.IsNaN(lat); i++)
                    {
                        try
                        {
                            string geoRaw = FetchUrlUtf8("https://geocoding-api.open-meteo.com/v1/search?count=1&language=zh&format=json&name=" + Uri.EscapeDataString(tries[i]), 4500);
                            Dictionary<string, object> geoObj = MiniJson.ParseObject(geoRaw);
                            List<object> res = geoObj != null && geoObj.ContainsKey("results") ? geoObj["results"] as List<object> : null;
                            if (res != null && res.Count > 0)
                            {
                                Dictionary<string, object> first = res[0] as Dictionary<string, object>;
                                if (first != null && first.ContainsKey("latitude") && first.ContainsKey("longitude"))
                                {
                                    lat = Convert.ToDouble(first["latitude"]);
                                    lon = Convert.ToDouble(first["longitude"]);
                                    if (first.ContainsKey("name") && first["name"] != null) cityName = Convert.ToString(first["name"]);
                                }
                            }
                        }
                        catch { }
                    }
                }

                if (double.IsNaN(lat))
                {
                    approxByIp = true;
                    try
                    {
                        string ipRaw = FetchUrlUtf8("http://ip-api.com/json/?lang=zh-CN", 6500);
                        Dictionary<string, object> ipObj = MiniJson.ParseObject(ipRaw);
                        if (ipObj != null && ipObj.ContainsKey("lat") && ipObj.ContainsKey("lon"))
                        {
                            lat = Convert.ToDouble(ipObj["lat"], System.Globalization.CultureInfo.InvariantCulture);
                            lon = Convert.ToDouble(ipObj["lon"], System.Globalization.CultureInfo.InvariantCulture);
                            if (ipObj.ContainsKey("city") && ipObj["city"] != null) cityName = Convert.ToString(ipObj["city"]);
                        }
                    }
                    catch { }
                }

                if (double.IsNaN(lat))
                {
                    try
                    {
                        string ipRaw2 = FetchUrlUtf8("https://ipwho.is/", 7500);
                        Dictionary<string, object> ipObj2 = MiniJson.ParseObject(ipRaw2);
                        if (ipObj2 != null && ipObj2.ContainsKey("latitude") && ipObj2.ContainsKey("longitude"))
                        {
                            lat = Convert.ToDouble(ipObj2["latitude"], System.Globalization.CultureInfo.InvariantCulture);
                            lon = Convert.ToDouble(ipObj2["longitude"], System.Globalization.CultureInfo.InvariantCulture);
                            if (ipObj2.ContainsKey("city") && ipObj2["city"] != null) cityName = Convert.ToString(ipObj2["city"]);
                        }
                    }
                    catch { }
                }

                if (double.IsNaN(lat) || double.IsNaN(lon))
                {
                    return MiniJson.Stringify(new Dictionary<string, object> {
                        { "ok", false },
                        { "error", "暂时未能定位城市，可在右键设置自定义城市名~" }
                    }, false);
                }

                string invLat = lat.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);
                string invLon = lon.ToString("0.####", System.Globalization.CultureInfo.InvariantCulture);
                string fcUrl = "https://api.open-meteo.com/v1/forecast?latitude=" + invLat + "&longitude=" + invLon +
                    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto";
                string fcRaw = FetchUrlUtf8(fcUrl, 9000);
                Dictionary<string, object> fcObj = MiniJson.ParseObject(fcRaw);
                Dictionary<string, object> cur = fcObj != null && fcObj.ContainsKey("current") ? fcObj["current"] as Dictionary<string, object> : null;
                if (cur == null)
                {
                    return MiniJson.Stringify(new Dictionary<string, object> {
                        { "ok", false },
                        { "error", "气象接口暂时无响应，稍后再试试喵~" }
                    }, false);
                }

                double tempC = cur.ContainsKey("temperature_2m") ? Convert.ToDouble(cur["temperature_2m"], System.Globalization.CultureInfo.InvariantCulture) : 0;
                double appC = cur.ContainsKey("apparent_temperature") ? Convert.ToDouble(cur["apparent_temperature"], System.Globalization.CultureInfo.InvariantCulture) : tempC;
                double hum = cur.ContainsKey("relative_humidity_2m") ? Convert.ToDouble(cur["relative_humidity_2m"], System.Globalization.CultureInfo.InvariantCulture) : 0;
                double wind = cur.ContainsKey("wind_speed_10m") ? Convert.ToDouble(cur["wind_speed_10m"], System.Globalization.CultureInfo.InvariantCulture) : 0;
                int code = cur.ContainsKey("weather_code") ? Convert.ToInt32(cur["weather_code"], System.Globalization.CultureInfo.InvariantCulture) : 0;
                string obs = cur.ContainsKey("time") && cur["time"] != null ? Convert.ToString(cur["time"]) : "";

                string summary, icon, tip;
                DescribeWmoCode(code, out summary, out icon, out tip);
                if (tempC <= 8 && icon != "rain" && icon != "storm") tip = "气温偏低，记得多加件外套保暖喵~";
                else if (tempC >= 32 && icon != "rain") tip = "外面好热呀，多喝水吹空调防暑♪";

                Dictionary<string, object> resObj = new Dictionary<string, object>(StringComparer.Ordinal);
                resObj["ok"] = true;
                resObj["city"] = string.IsNullOrEmpty(cityName) ? "当前位置" : cityName;
                resObj["approxByIp"] = approxByIp;
                resObj["temperatureC"] = Math.Round(tempC, 1);
                resObj["apparentC"] = Math.Round(appC, 1);
                resObj["humidityPercent"] = Math.Round(hum, 0);
                resObj["windKph"] = Math.Round(wind, 1);
                resObj["code"] = code;
                resObj["summary"] = summary;
                resObj["icon"] = icon;
                resObj["tip"] = tip;
                resObj["observedAt"] = obs;

                string outJson = MiniJson.Stringify(resObj, false);
                lock (_weatherLock)
                {
                    _cachedWeatherJson = outJson;
                    _cachedWeatherKey = key;
                    _cachedWeatherUtc = DateTime.UtcNow;
                }
                return outJson;
            }
            catch (Exception ex)
            {
                return MiniJson.Stringify(new Dictionary<string, object> {
                    { "ok", false },
                    { "error", "获取天气失败: " + ex.Message }
                }, false);
            }
        }

        private void HandleRequest(HttpListenerContext ctx)
        {
            try
            {
                string rawPath = ctx.Request.Url.AbsolutePath ?? "/";
                if (rawPath == "/" || rawPath == "/index.html")
                {
                    string htmlPath = Path.Combine(_baseDir, "pet-ui.html");
                    byte[] html = File.Exists(htmlPath)
                        ? File.ReadAllBytes(htmlPath)
                        : Encoding.UTF8.GetBytes("<html><body style='background:transparent'></body></html>");
                    ctx.Response.ContentType = "text/html; charset=utf-8";
                    ctx.Response.Headers["Cache-Control"] = "no-store";
                    ctx.Response.ContentLength64 = html.Length;
                    ctx.Response.OutputStream.Write(html, 0, html.Length);
                }
                else if (rawPath == "/api/anims")
                {
                    List<object> names = new List<object>();
                    foreach (string n in ListWebmNames()) names.Add(n);
                    byte[] buf = Encoding.UTF8.GetBytes(MiniJson.Stringify(names, false));
                    ctx.Response.ContentType = "application/json; charset=utf-8";
                    ctx.Response.Headers["Cache-Control"] = "no-store";
                    ctx.Response.ContentLength64 = buf.Length;
                    ctx.Response.OutputStream.Write(buf, 0, buf.Length);
                }
                else if (rawPath == "/api/memes")
                {
                    byte[] buf = Encoding.UTF8.GetBytes(_memesJson);
                    ctx.Response.ContentType = "application/json; charset=utf-8";
                    ctx.Response.ContentLength64 = buf.Length;
                    ctx.Response.OutputStream.Write(buf, 0, buf.Length);
                }
                else if (rawPath == "/api/weather")
                {
                    string q = ctx.Request.Url.Query ?? "";
                    bool force = q.IndexOf("force=1", StringComparison.OrdinalIgnoreCase) >= 0;
                    string cityParam = "";
                    int cIdx = q.IndexOf("city=", StringComparison.OrdinalIgnoreCase);
                    if (cIdx >= 0)
                    {
                        string sub = q.Substring(cIdx + 5);
                        int amp = sub.IndexOf('&');
                        if (amp >= 0) sub = sub.Substring(0, amp);
                        cityParam = Uri.UnescapeDataString(sub.Replace('+', ' '));
                    }
                    string json = QueryWeatherJson(cityParam, force);
                    byte[] buf = Encoding.UTF8.GetBytes(json);
                    ctx.Response.ContentType = "application/json; charset=utf-8";
                    ctx.Response.Headers["Cache-Control"] = "no-store";
                    ctx.Response.ContentLength64 = buf.Length;
                    ctx.Response.OutputStream.Write(buf, 0, buf.Length);
                }
                else if (rawPath == "/api/todos")
                {
                    if (string.Equals(ctx.Request.HttpMethod, "POST", StringComparison.OrdinalIgnoreCase))
                    {
                        string body = "[]";
                        using (StreamReader sr = new StreamReader(ctx.Request.InputStream, Encoding.UTF8))
                        {
                            body = sr.ReadToEnd();
                        }
                        if (string.IsNullOrWhiteSpace(body)) body = "[]";
                        File.WriteAllText(_todosPath, body, new UTF8Encoding(false));
                        byte[] okBuf = Encoding.UTF8.GetBytes("{\"ok\":true}");
                        ctx.Response.ContentType = "application/json; charset=utf-8";
                        ctx.Response.ContentLength64 = okBuf.Length;
                        ctx.Response.OutputStream.Write(okBuf, 0, okBuf.Length);
                    }
                    else
                    {
                        string content = File.Exists(_todosPath) ? File.ReadAllText(_todosPath, Encoding.UTF8) : "[]";
                        if (string.IsNullOrWhiteSpace(content)) content = "[]";
                        byte[] buf = Encoding.UTF8.GetBytes(content);
                        ctx.Response.ContentType = "application/json; charset=utf-8";
                        ctx.Response.Headers["Cache-Control"] = "no-store";
                        ctx.Response.ContentLength64 = buf.Length;
                        ctx.Response.OutputStream.Write(buf, 0, buf.Length);
                    }
                }
                else if (rawPath.StartsWith("/assets/", StringComparison.OrdinalIgnoreCase))
                {
                    string fileName = Path.GetFileName(Uri.UnescapeDataString(rawPath.Substring("/assets/".Length)));
                    string full = Path.Combine(_assetsDir, fileName);
                    if (!string.IsNullOrEmpty(fileName) && File.Exists(full))
                    {
                        byte[] data = File.ReadAllBytes(full);
                        string ext = Path.GetExtension(fileName).ToLowerInvariant();
                        ctx.Response.ContentType = ext == ".wav" ? "audio/wav" : ext == ".ttf" ? "font/ttf" : "application/octet-stream";
                        ctx.Response.Headers["Cache-Control"] = "public, max-age=86400";
                        ctx.Response.ContentLength64 = data.Length;
                        ctx.Response.OutputStream.Write(data, 0, data.Length);
                    }
                    else
                    {
                        ctx.Response.StatusCode = 404;
                    }
                }
                else if (rawPath.StartsWith("/anims/webm/", StringComparison.OrdinalIgnoreCase))
                {
                    string encoded = rawPath.Substring("/anims/webm/".Length);
                    string fileName = Path.GetFileName(Uri.UnescapeDataString(encoded));
                    string full = Path.Combine(_webmDir, fileName);
                    if (!string.IsNullOrEmpty(fileName) && File.Exists(full))
                    {
                        byte[] data = File.ReadAllBytes(full);
                        ctx.Response.ContentType = "video/webm";
                        ctx.Response.Headers["Cache-Control"] = "public, max-age=3600";
                        ctx.Response.ContentLength64 = data.Length;
                        ctx.Response.OutputStream.Write(data, 0, data.Length);
                    }
                    else
                    {
                        ctx.Response.StatusCode = 404;
                    }
                }
                else
                {
                    ctx.Response.StatusCode = 404;
                }
            }
            catch { }
            finally
            {
                try { ctx.Response.OutputStream.Close(); } catch { }
                try { ctx.Response.Close(); } catch { }
            }
        }

        public void Dispose()
        {
            _stopped = true;
            try { _listener.Stop(); } catch { }
            try { _listener.Close(); } catch { }
        }
    }

    internal struct PetHitRect
    {
        public string Kind;
        public Rectangle Rect;
    }

    internal sealed class WebViewPetForm : Form
    {
        private readonly string _baseDir;
        private readonly PetAssetServer _server;
        private readonly DesktopPetPrefs _prefs;

        private IDCompositionDevice _dcomp;
        private IDCompositionTarget _dcompTarget;
        private IDCompositionVisual _rootVisual;
        private ICoreWebView2CompositionController _compCtrl;
        private ICoreWebView2Controller2 _ctrl2;
        private ICoreWebView2 _webview;
        private bool _webReady = false;
        private readonly List<string> _pendingScripts = new List<string>();
        private readonly List<PetHitRect> _hitRects = new List<PetHitRect>();
        private readonly object _hitLock = new object();

        private readonly System.Windows.Forms.Timer _tickTimer;
        private readonly System.Windows.Forms.Timer _topmostTimer;
        private readonly System.Windows.Forms.Timer _tapResolveTimer;
        private readonly ContextMenuStrip _menu;
        private readonly List<ToolStripMenuItem> _sizeMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _throwPowerMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _gravityMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _restitutionMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _frictionMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _fontMenuItems = new List<ToolStripMenuItem>();
        private readonly List<ToolStripMenuItem> _userTitleMenuItems = new List<ToolStripMenuItem>();
        private ToolStripMenuItem _userTitleRootMenuItem;
        private ToolStripMenuItem _userTitleCustomMenuItem;
        private ToolStripMenuItem _clickSoundMenuItem;
        private ToolStripMenuItem _slingshotMenuItem;
        private ToolStripMenuItem _bestScoreMenuItem;
        private ToolStripMenuItem _dragSpringMenuItem;
        private ToolStripMenuItem _ceilingBounceMenuItem;
        private ToolStripMenuItem _workAnimMenuItem;
        private ToolStripMenuItem _autoPlayMenuItem;
        private ToolStripMenuItem _fixedMenuItem;
        private ToolStripMenuItem _crossScreenMenuItem;
        private ToolStripMenuItem _chatterMenuItem;
        private ToolStripMenuItem _taskBubbleMenuItem;
        private ToolStripMenuItem _topMostMenuItem;
        private ToolStripMenuItem _agyFastMenuItem;
        private ToolStripMenuItem _sleepMenuItem;
        private ToolStripMenuItem _updateMenuItem;
        private bool _updateChecking = false;
        private bool _updateDownloading = false;
        private string _latestUpdateVersion = "";
        private string _latestUpdateAssetName = "";
        private string _latestUpdateUrl = "";
        private long _latestUpdateSize = 0;
        private string _latestSha256Url = "";
        private string _latestReleasePageUrl = "https://github.com/Mexix-Collab/agy-pet/releases/latest";
        private bool _isSleeping = false;
        private int _lastQuotaUsedPct = 20;
        private string _lastQuotaSummary = "";
        private bool _menuOpen = false;
        private bool _isClickThrough = false;
        private bool _inputFocusActive = false;
        private bool _hoveringPet = false;
        private bool _hoveringBubble = false;
        private int _lastHoverX = -9999;
        private int _lastHoverY = -9999;
        private bool _prevKeyS = false;
        private bool _prevKeyD = false;
        private bool _prevKeyW = false;
        private bool _prevKeyC = false;

        // Drag / slingshot / throw / autonomous roam physics (DWM VSync + dsh-pet spring & substep feel)
        private const float DragSpringK = 320f;
        private const float DragSpringC = 36f;
        private float _fx, _fy, _vx, _vy;
        private float _dragTargetX, _dragTargetY, _dragVx, _dragVy;
        private bool _dragging = false;
        private bool _lifted = false;
        private bool _slingshotMode = false;
        private bool _airCatchScored = false;
        private double _lastPetDownMs = 0;
        private bool _throwing = false;
        private bool _throwPrevGrounded = false;
        private Rectangle _throwLockedArea = Rectangle.Empty;
        private bool _bubbleMouseDown = false;
        private Point _dragStartScreen;
        private float _dragStartFormX, _dragStartFormY;
        private readonly List<Tuple<int, int, double>> _trail = new List<Tuple<int, int, double>>();
        private int _tapCount = 0;
        private double _lastTapUpMs = 0;
        private Point _lastTapScreen = Point.Empty;
        private double _lastMotionMs;
        private int _lastWinX = int.MinValue;
        private int _lastWinY = int.MinValue;

        // On-demand DWM VSync pacer (0% CPU when idle; locks to 60/100/144Hz monitor refresh during drag/throw/roam)
        private readonly ManualResetEvent _vsyncWake = new ManualResetEvent(false);
        private Thread _vsyncThread;
        private volatile bool _vsyncRunning = false;
        private volatile bool _vsyncStop = false;
        private int _vsyncPending = 0;

        // Autonomous move segment driven by pet-ui.html
        private bool _roamActive = false;
        private double _roamStartAtMs = 0;
        private double _roamEndAtMs = 0;
        private float _roamStartX = 0;
        private float _roamTargetX = 0;

        private static double NowMs()
        {
            return Stopwatch.GetTimestamp() * 1000.0 / Stopwatch.Frequency;
        }

        private void MoveWindowFast(float fx, float fy)
        {
            int ix = (int)Math.Round(fx);
            int iy = (int)Math.Round(fy);
            if (ix == _lastWinX && iy == _lastWinY) return;
            _lastWinX = ix;
            _lastWinY = iy;
            if (IsHandleCreated && !IsDisposed)
            {
                NativePetWin32.SetWindowPos(
                    Handle,
                    IntPtr.Zero,
                    ix,
                    iy,
                    0,
                    0,
                    NativePetWin32.SWP_NOSIZE
                    | NativePetWin32.SWP_NOZORDER
                    | NativePetWin32.SWP_NOACTIVATE
                    | NativePetWin32.SWP_NOSENDCHANGING);
            }
            else
            {
                Location = new Point(ix, iy);
            }
        }

        private void SetMotionActive(bool active)
        {
            _vsyncRunning = active;
            if (active)
            {
                _lastMotionMs = NowMs();
                try { _vsyncWake.Set(); } catch { }
            }
            else
            {
                try { _vsyncWake.Reset(); } catch { }
            }
        }

        private void StartVsyncPacerThread()
        {
            _vsyncThread = new Thread(VsyncPacerLoop);
            _vsyncThread.IsBackground = true;
            _vsyncThread.Name = "PetDwmVsync";
            _vsyncThread.Priority = ThreadPriority.AboveNormal;
            _vsyncThread.Start();
        }

        private void VsyncPacerLoop()
        {
            while (!_vsyncStop)
            {
                if (!_vsyncRunning)
                {
                    try { _vsyncWake.WaitOne(250); } catch { break; }
                    continue;
                }
                double t0 = NowMs();
                int hr = -1;
                try { hr = NativePetWin32.DwmFlush(); } catch { hr = -1; }
                double elapsed = NowMs() - t0;
                // Fallback sleep if DWM is unavailable (e.g. RDP/session 0) so we never busy-spin
                if (hr != 0 || elapsed < 2.0)
                {
                    Thread.Sleep(8);
                }
                if (_vsyncStop || !_vsyncRunning) continue;
                if (IsHandleCreated && !IsDisposed && Interlocked.CompareExchange(ref _vsyncPending, 1, 0) == 0)
                {
                    try
                    {
                        BeginInvoke((Action)OnVsyncUiFrame);
                    }
                    catch
                    {
                        Interlocked.Exchange(ref _vsyncPending, 0);
                    }
                }
            }
        }

        private void OnVsyncUiFrame()
        {
            Interlocked.Exchange(ref _vsyncPending, 0);
            if (!Visible || IsDisposed)
            {
                SetMotionActive(false);
                return;
            }
            StepMotionFrame();
        }

        private NekoTelemetryState _telemetry = new NekoTelemetryState();
        private bool _userHidden = false;
        private Rectangle _petVisualRect = Rectangle.Empty;
        public Action<bool> OnDesktopVisibilityChanged;
        public Action<string, int, bool> OnTaskDismissed;
        public Action<string, string, string> OnActivateConversation;

        public WebViewPetForm(string baseDir, PetAssetServer server)
        {
            _baseDir = baseDir;
            _server = server;
            _prefs = DesktopPetPrefs.Load(baseDir);

            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = _prefs.TopMost;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.Black;
            Cursor = Cursors.Hand;

            UpdateWindowMetrics(false);

            Rectangle wa = Screen.PrimaryScreen != null ? Screen.PrimaryScreen.WorkingArea : new Rectangle(0, 0, 1280, 800);
            if (_prefs.SavedX.HasValue && _prefs.SavedY.HasValue)
            {
                _fx = _prefs.SavedX.Value;
                _fy = _prefs.SavedY.Value;
                ClampIntoScreen();
            }
            else
            {
                _fx = wa.Right - Width - 16;
                _fy = wa.Bottom - Height - 2;
            }
            _lastWinX = (int)Math.Round(_fx);
            _lastWinY = (int)Math.Round(_fy);
            Location = new Point(_lastWinX, _lastWinY);

            _menu = BuildMenu();
            _menu.Opening += (s, e) =>
            {
                _menuOpen = true;
                // Temporarily lower pet below the context menu instead of clearing Region (keeps pet visible while menu stays cleanly on top)
                if (IsHandleCreated) NativePetWin32.AssertTopMost(Handle, false);
            };
            _menu.Opened += (s, e) =>
            {
                try
                {
                    if (_menu.IsHandleCreated)
                    {
                        NativePetWin32.AssertTopMost(_menu.Handle, true);
                        NativePetWin32.SetForegroundWindow(_menu.Handle);
                    }
                }
                catch { }
            };
            _menu.Closed += (s, e) =>
            {
                _menuOpen = false;
                AssertTopMostNow();
            };

            Load += OnFormLoad;
            MouseDown += OnPetMouseDown;
            MouseMove += OnPetMouseMove;
            MouseUp += OnPetMouseUp;

            _tapResolveTimer = new System.Windows.Forms.Timer();
            _tapResolveTimer.Interval = 260;
            _tapResolveTimer.Tick += OnTapResolveTick;

            _lastMotionMs = NowMs();
            StartVsyncPacerThread();

            // Idle pointer hit-test & click-through poller (motion is driven on DWM VSync above)
            _tickTimer = new System.Windows.Forms.Timer();
            _tickTimer.Interval = 45;
            _tickTimer.Tick += OnPhysicsAndPointerTick;
            _tickTimer.Start();

            // Win32 TopMost watchdog: keeps pet reliably above all standard windows & taskbar without stealing focus
            _topmostTimer = new System.Windows.Forms.Timer();
            _topmostTimer.Interval = 1500;
            _topmostTimer.Tick += (s, e) => { if (!_dragging && !_throwing) AssertTopMostNow(); };
            _topmostTimer.Start();
        }

        protected override CreateParams CreateParams
        {
            get
            {
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= NativePetWin32.WS_EX_NOREDIRECTIONBITMAP
                            | NativePetWin32.WS_EX_TOOLWINDOW
                            | NativePetWin32.WS_EX_TOPMOST
                            | NativePetWin32.WS_EX_NOACTIVATE;
                return cp;
            }
        }

        protected override bool ShowWithoutActivation { get { return !_inputFocusActive; } }

        protected override void WndProc(ref Message m)
        {
            if (m.Msg == NativePetWin32.WM_MOUSEACTIVATE && !_inputFocusActive)
            {
                m.Result = (IntPtr)NativePetWin32.MA_NOACTIVATE;
                return;
            }
            base.WndProc(ref m);
        }

        private float CurrentDpiScale()
        {
            return IsHandleCreated ? NativePetWin32.GetDpiScale(Handle) : 1.0f;
        }

        private void UpdateWindowMetrics(bool preserveAnchor)
        {
            float dpi = CurrentDpiScale();
            int petW = (int)Math.Round(_prefs.PetSize * dpi);
            int petH = (int)Math.Round(petW * 9.0 / 16.0);
            int topPad = (int)Math.Round(540 * dpi);
            int newW = Math.Max(petW + (int)Math.Round(24 * dpi), (int)Math.Round(380 * dpi));
            int newH = petH + topPad;

            int oldW = Width;
            int oldH = Height;
            Size = new Size(newW, newH);
            if (preserveAnchor && oldW > 0 && oldH > 0)
            {
                _fx += (oldW - newW) / 2f;
                _fy += (oldH - newH);
                ClampIntoScreen();
                _lastWinX = (int)Math.Round(_fx);
            _lastWinY = (int)Math.Round(_fy);
            Location = new Point(_lastWinX, _lastWinY);
            }
            if (_ctrl2 != null)
            {
                try
                {
                    _ctrl2.put_Bounds(new NativePetWin32.RECT { Left = 0, Top = 0, Right = ClientSize.Width, Bottom = ClientSize.Height });
                }
                catch { }
            }
            if (_dcomp != null)
            {
                try { _dcomp.Commit(); } catch { }
            }
        }

        private void WritePetLog(string msg)
        {
            try
            {
                string line = "[" + DateTime.Now.ToString("HH:mm:ss") + "] " + msg + "\n";
                File.AppendAllText(Path.Combine(_baseDir, "pet-status.log"), line, new UTF8Encoding(false));
            }
            catch { }
        }

        private void OnFormLoad(object sender, EventArgs e)
        {
            try { File.WriteAllText(Path.Combine(_baseDir, "pet-status.log"), "", new UTF8Encoding(false)); } catch { }
            UpdateWindowMetrics(false);
            Rectangle wa = Screen.PrimaryScreen != null ? Screen.PrimaryScreen.WorkingArea : new Rectangle(0, 0, 1280, 800);
            if (_prefs.SavedX.HasValue && _prefs.SavedY.HasValue)
            {
                _fx = _prefs.SavedX.Value;
                _fy = _prefs.SavedY.Value;
                ClampIntoScreen();
            }
            else
            {
                _fx = wa.Right - Width - 16;
                _fy = wa.Bottom - Height - 2;
            }
            _lastWinX = (int)Math.Round(_fx);
            _lastWinY = (int)Math.Round(_fy);
            Location = new Point(_lastWinX, _lastWinY);
            string scrName = "";
            try { scrName = Screen.FromControl(this).DeviceName; } catch { }
            WritePetLog(string.Format("FormLoad hwnd=0x{0:X} rect=({1},{2}) {3}x{4} dpi={5:0.00} topMost={6} screen={7}",
                IsHandleCreated ? Handle.ToInt64() : 0L, Left, Top, Width, Height, CurrentDpiScale(), _prefs.TopMost, scrName));
            InitWebView2DirectComposition();
            AssertTopMostNow();
            ScheduleDailyUpdateCheck();
        }

        private void InitWebView2DirectComposition()
        {
            try
            {
                Guid dcompIid = new Guid("C37EA93A-E7AA-450D-B16F-9746CB0407F3");
                int hrD = NativePetWin32.DCompositionCreateDevice(IntPtr.Zero, ref dcompIid, out _dcomp);
                if (hrD != 0 || _dcomp == null) return;
                if (_dcomp.CreateTargetForHwnd(Handle, true, out _dcompTarget) != 0) return;
                if (_dcomp.CreateVisual(out _rootVisual) != 0) return;
                _dcompTarget.SetRoot(_rootVisual);

                string udf = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "agy-pet", "webview2-pet-cache");
                Directory.CreateDirectory(udf);

                NativePetWin32.CreateCoreWebView2EnvironmentWithOptions(
                    null, udf, IntPtr.Zero,
                    new Wv2EnvHandler((hr1, env) =>
                    {
                        if (hr1 != 0 || env == null || IsDisposed) return;
                        ICoreWebView2Environment3 env3 = env as ICoreWebView2Environment3;
                        if (env3 == null) return;
                        env3.CreateCoreWebView2CompositionController(
                            Handle,
                            new Wv2CompHandler((hr2, comp) =>
                            {
                                if (hr2 != 0 || comp == null || IsDisposed) return;
                                _compCtrl = comp;
                                _compCtrl.put_RootVisualTarget(_rootVisual);
                                _dcomp.Commit();

                                _ctrl2 = comp as ICoreWebView2Controller2;
                                if (_ctrl2 != null)
                                {
                                    _ctrl2.put_DefaultBackgroundColor(new NativePetWin32.COREWEBVIEW2_COLOR { A = 0, R = 0, G = 0, B = 0 });
                                    _ctrl2.put_Bounds(new NativePetWin32.RECT { Left = 0, Top = 0, Right = ClientSize.Width, Bottom = ClientSize.Height });
                                    _ctrl2.put_IsVisible(1);
                                    _dcomp.Commit();

                                    ICoreWebView2 wv;
                                    if (_ctrl2.get_CoreWebView2(out wv) == 0 && wv != null)
                                    {
                                        _webview = wv;
                                        long msgToken;
                                        _webview.add_WebMessageReceived(new Wv2MsgHandler(OnWebMessage), out msgToken);
                                        string navUrl = "http://127.0.0.1:" + _server.Port + "/";
                                        WritePetLog("WebView2 CompCtrl ready, navigating " + navUrl);
                                        _webview.Navigate(navUrl);
                                    }
                                }
                                AssertTopMostNow();
                            }));
                    }));
            }
            catch { }
        }

        private void EvalJs(string script)
        {
            if (string.IsNullOrEmpty(script) || IsDisposed) return;
            if (!_webReady || _webview == null)
            {
                _pendingScripts.Add(script);
                return;
            }
            try { _webview.ExecuteScript(script, IntPtr.Zero); } catch { }
        }

        private void PushPrefsToWeb()
        {
            Dictionary<string, object> p = new Dictionary<string, object>(StringComparer.Ordinal);
            p["petName"] = _prefs.PetName ?? "星璃喵";
            p["userTitle"] = string.IsNullOrWhiteSpace(_prefs.UserTitle) ? "老大" : _prefs.UserTitle;
            p["fontFamily"] = _prefs.FontFamily ?? "youyuan";
            p["clickSoundEnabled"] = _prefs.ClickSoundEnabled;
            p["slingshotEnabled"] = _prefs.SlingshotEnabled;
            p["weatherCity"] = _prefs.WeatherCity ?? "";
            p["bestCatchScore"] = _prefs.BestCatchScore;
            p["autoPlay"] = _prefs.AutoPlay;
            p["fixed"] = _prefs.Fixed;
            p["workAnimEnabled"] = _prefs.WorkAnimEnabled;
            p["chatterEnabled"] = _prefs.ChatterEnabled;
            p["taskBubbleEnabled"] = _prefs.TaskBubbleEnabled;
            EvalJs("window.__petApi && window.__petApi.setSize(" + _prefs.PetSize + ");");
            EvalJs("window.__petApi && window.__petApi.setPrefs(" + MiniJson.Stringify(p, false) + ");");
        }

        private void PushTelemetryToWeb()
        {
            Dictionary<string, object> t = new Dictionary<string, object>(StringComparer.Ordinal);
            t["running"] = _telemetry.Running;
            t["workState"] = _telemetry.WorkState ?? "idle";
            t["doneState"] = _telemetry.DoneState ?? "";

            List<object> taskArr = new List<object>();
            if (_telemetry.Tasks != null)
            {
                for (int i = 0; i < _telemetry.Tasks.Count; i++)
                {
                    NekoTaskItem item = _telemetry.Tasks[i];
                    if (item == null || string.IsNullOrEmpty(item.StatusText)) continue;
                    Dictionary<string, object> o = new Dictionary<string, object>(StringComparer.Ordinal);
                    o["id"] = item.Id ?? "";
                    o["shortTitle"] = item.ShortTitle ?? "";
                    o["taskTitle"] = item.TaskTitle ?? "";
                    o["windowTitle"] = item.WindowTitle ?? "";
                    o["workState"] = item.WorkState ?? "idle";
                    o["running"] = item.Running;
                    o["doneState"] = item.DoneState ?? "";
                    o["statusText"] = item.StatusText ?? "";
                    o["steps"] = item.Steps;
                    o["elapsedSec"] = item.ElapsedSec;
                    o["agentMode"] = string.IsNullOrEmpty(item.AgentMode) ? "single" : item.AgentMode;
                    o["subagentRunning"] = item.SubagentRunning;
                    o["subagentTotal"] = item.SubagentTotal;
                    List<object> cl = new List<object>();
                    if (item.ChildLines != null)
                    {
                        for (int j = 0; j < item.ChildLines.Count; j++) cl.Add(item.ChildLines[j]);
                    }
                    o["childLines"] = cl;
                    List<object> dl = new List<object>();
                    if (item.DetailLines != null)
                    {
                        for (int j = 0; j < item.DetailLines.Count; j++) dl.Add(item.DetailLines[j]);
                    }
                    o["detailLines"] = dl;
                    taskArr.Add(o);
                }
            }
            t["tasks"] = taskArr;
            EvalJs("window.__petApi && window.__petApi.applyTelemetry(" + MiniJson.Stringify(t, false) + ");");
        }

        private void OnWebMessage(string json)
        {
            try
            {
                Dictionary<string, object> msg = MiniJson.ParseObject(json);
                string type = msg.ContainsKey("type") ? Convert.ToString(msg["type"]) : "";
                if (type == "ready")
                {
                    _webReady = true;
                    PushPrefsToWeb();
                    PushTelemetryToWeb();
                    for (int i = 0; i < _pendingScripts.Count; i++)
                    {
                        try { _webview.ExecuteScript(_pendingScripts[i], IntPtr.Zero); } catch { }
                    }
                    _pendingScripts.Clear();
                    if (_dcomp != null) { try { _dcomp.Commit(); } catch { } }
                    int vw = msg.ContainsKey("videoW") ? Convert.ToInt32(msg["videoW"]) : 0;
                    int vh = msg.ContainsKey("videoH") ? Convert.ToInt32(msg["videoH"]) : 0;
                    int rs = msg.ContainsKey("readyState") ? Convert.ToInt32(msg["readyState"]) : 0;
                    WritePetLog(string.Format("pet-ui ready, video={0}x{1} readyState={2}", vw, vh, rs));
                    AssertTopMostNow();
                }
                else if (type == "hitRects")
                {
                    List<object> arr = msg.ContainsKey("rects") ? msg["rects"] as List<object> : null;
                    lock (_hitLock)
                    {
                        _hitRects.Clear();
                        _petVisualRect = Rectangle.Empty;
                        if (arr != null)
                        {
                            for (int i = 0; i < arr.Count; i++)
                            {
                                Dictionary<string, object> r = arr[i] as Dictionary<string, object>;
                                if (r == null) continue;
                                string kind = r.ContainsKey("kind") ? Convert.ToString(r["kind"]) : "pet";
                                int rx = r.ContainsKey("x") ? Convert.ToInt32(r["x"]) : 0;
                                int ry = r.ContainsKey("y") ? Convert.ToInt32(r["y"]) : 0;
                                int rw = r.ContainsKey("w") ? Convert.ToInt32(r["w"]) : 0;
                                int rh = r.ContainsKey("h") ? Convert.ToInt32(r["h"]) : 0;
                                if (rw > 0 && rh > 0)
                                {
                                    if (kind == "petVisual")
                                    {
                                        _petVisualRect = new Rectangle(rx, ry, rw, rh);
                                    }
                                    else
                                    {
                                        _hitRects.Add(new PetHitRect { Kind = kind, Rect = new Rectangle(rx, ry, rw, rh) });
                                    }
                                }
                            }
                        }
                    }
                    ApplyWindowRegionFromHits();
                }
                else if (type == "moveStart")
                {
                    if (_dragging || _throwing) return;
                    int dir = msg.ContainsKey("dir") ? Convert.ToInt32(msg["dir"]) : -1;
                    int dist = msg.ContainsKey("dist") ? Convert.ToInt32(msg["dist"]) : 100;
                    int leadMs = msg.ContainsKey("leadMs") ? Convert.ToInt32(msg["leadMs"]) : 1300;
                    int durMs = msg.ContainsKey("durationMs") ? Convert.ToInt32(msg["durationMs"]) : 6000;
                    float dpi = CurrentDpiScale();
                    float scaledDist = dist * dpi;
                    int footY = (int)Math.Round(_fy + Height - 20);
                    float bodyPad = Width * 0.22f;
                    float targetX = _fx + dir * scaledDist;

                    if (_prefs.AllowCrossScreen)
                    {
                        int targetCenterX = (int)Math.Round(targetX + Width / 2f);
                        Rectangle destWa;
                        if (!TryFindWorkAreaAt(targetCenterX, footY, out destWa))
                        {
                            dir = -dir;
                            targetX = _fx + dir * scaledDist;
                            targetCenterX = (int)Math.Round(targetX + Width / 2f);
                            if (!TryFindWorkAreaAt(targetCenterX, footY, out destWa))
                            {
                                Rectangle curWa = Screen.FromPoint(new Point(Left + Width / 2, footY)).WorkingArea;
                                float minX = curWa.Left - bodyPad + 12f;
                                float maxX = Math.Max(minX + 10f, curWa.Right - Width + bodyPad - 12f);
                                targetX = Math.Max(minX, Math.Min(maxX, targetX));
                            }
                            // facingRight: dir > 0 means facing right (mirrored scaleX(-1)), dir < 0 means native left
                            EvalJs("window.__petApi && window.__petApi.setFacing(" + (dir > 0 ? "true" : "false") + ");");
                        }
                    }
                    else
                    {
                        Rectangle wa = Screen.FromPoint(new Point(Left + Width / 2, footY)).WorkingArea;
                        float minX = wa.Left - bodyPad + 12f;
                        float maxX = Math.Max(minX + 10f, wa.Right - Width + bodyPad - 12f);
                        if (targetX < minX || targetX > maxX)
                        {
                            dir = -dir;
                            targetX = Math.Max(minX, Math.Min(maxX, _fx + dir * scaledDist));
                            EvalJs("window.__petApi && window.__petApi.setFacing(" + (dir > 0 ? "true" : "false") + ");");
                        }
                    }
                    double now = NowMs();
                    _roamActive = true;
                    _roamStartAtMs = now + Math.Max(0, leadMs);
                    _roamEndAtMs = _roamStartAtMs + Math.Max(800, durMs);
                    _roamStartX = _fx;
                    _roamTargetX = targetX;
                    SetMotionActive(true);
                }
                else if (type == "moveCancel")
                {
                    _roamActive = false;
                    if (!_dragging && !_throwing) SetMotionActive(false);
                }
                else if (type == "sleepState")
                {
                    _isSleeping = msg.ContainsKey("sleeping") && Equals(msg["sleeping"], true);
                }
                else if (type == "focusInput")
                {
                    bool active = msg.ContainsKey("active") && Equals(msg["active"], true);
                    _inputFocusActive = active;
                    if (IsHandleCreated)
                    {
                        NativePetWin32.SetNoActivate(Handle, !active);
                        if (active)
                        {
                            SetClickThrough(false);
                            NativePetWin32.SetForegroundWindow(Handle);
                            if (_ctrl2 != null) { try { _ctrl2.MoveFocus(0); } catch { } }
                        }
                    }
                }
                else if (type == "activateAgy")
                {
                    string tid = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : "";
                    string wt = msg.ContainsKey("windowTitle") ? Convert.ToString(msg["windowTitle"]) : "";
                    string tt = msg.ContainsKey("taskTitle") ? Convert.ToString(msg["taskTitle"]) : "";
                    WritePetLog(string.Format("activateAgy id={0} wt=[{1}] tt=[{2}]", tid, wt, tt));
                    NativePetWin32.BringAntigravityToFront(wt, tt);
                    if (OnActivateConversation != null) OnActivateConversation(tid, tt, wt);
                }
                else if (type == "dismissTask")
                {
                    string tid = msg.ContainsKey("id") ? Convert.ToString(msg["id"]) : "";
                    int st = msg.ContainsKey("steps") ? Convert.ToInt32(msg["steps"]) : 0;
                    bool running = msg.ContainsKey("running") && Equals(msg["running"], true);
                    if (OnTaskDismissed != null) OnTaskDismissed(tid, st, running);
                }
            }
            catch { }
        }

        private void ApplyWindowRegionFromHits()
        {
            // DirectComposition (WS_EX_NOREDIRECTIONBITMAP) cannot combine with WS_EX_LAYERED,
            // so Win32 Form.Region is required to make the top 420px blank area truly click-through to desktop/windows behind.
            // Because _petVisualRect covers the full 100%x100% 16:9 video canvas (all outer edges are pure alpha=0)
            // and bubble rects are inflated by 16px for drop shadows, wide animations are NEVER clipped and blank top space NEVER blocks clicks.
            if (IsDisposed || !IsHandleCreated) return;
            try
            {
                Region nextReg = null;
                lock (_hitLock)
                {
                    if (!_petVisualRect.IsEmpty)
                    {
                        nextReg = new Region(_petVisualRect);
                    }
                    for (int i = 0; i < _hitRects.Count; i++)
                    {
                        Rectangle r = _hitRects[i].Rect;
                        if (_hitRects[i].Kind == "bubble")
                        {
                            r = Rectangle.Inflate(r, 16, 16);
                        }
                        if (nextReg == null) nextReg = new Region(r);
                        else nextReg.Union(r);
                    }
                }
                if (nextReg != null)
                {
                    Region prevReg = Region;
                    Region = nextReg;
                    if (prevReg != null) prevReg.Dispose();
                }
            }
            catch { }
        }

        private string HitKindAt(Point clientPt)
        {
            lock (_hitLock)
            {
                // Check bubble first (higher z-index)
                for (int i = 0; i < _hitRects.Count; i++)
                {
                    if (_hitRects[i].Kind == "bubble" && _hitRects[i].Rect.Contains(clientPt)) return "bubble";
                }
                for (int i = 0; i < _hitRects.Count; i++)
                {
                    if (_hitRects[i].Kind == "pet" && _hitRects[i].Rect.Contains(clientPt)) return "pet";
                }
            }
            return "";
        }

        private void SetClickThrough(bool clickThrough)
        {
            if (_isClickThrough == clickThrough || !IsHandleCreated) return;
            _isClickThrough = clickThrough;
            NativePetWin32.ApplyClickThrough(Handle, clickThrough);
        }

        public void AssertTopMostNow()
        {
            if (IsDisposed || !IsHandleCreated || !Visible || _menuOpen) return;
            NativePetWin32.AssertTopMost(Handle, _prefs.TopMost);
        }

        private static bool TryFindWorkAreaAt(int x, int y, out Rectangle wa)
        {
            Screen[] screens = Screen.AllScreens;
            for (int i = 0; i < screens.Length; i++)
            {
                Rectangle r = screens[i].WorkingArea;
                if (x >= r.Left && x < r.Right && y >= r.Top && y < r.Bottom)
                {
                    wa = r;
                    return true;
                }
            }
            wa = Rectangle.Empty;
            return false;
        }

        private static bool HasNeighborScreenHorizontal(int targetX, int sampleY)
        {
            Screen[] screens = Screen.AllScreens;
            for (int i = 0; i < screens.Length; i++)
            {
                Rectangle r = screens[i].WorkingArea;
                if (targetX >= r.Left && targetX < r.Right && sampleY >= r.Top - 80 && sampleY <= r.Bottom + 80)
                {
                    return true;
                }
            }
            return false;
        }

        private float GetPetModelTopOffset()
        {
            // Align ceiling collision with the actual pet character's head rather than the 420px top task-bubble padding
            float dpi = CurrentDpiScale();
            int petW = (int)Math.Round(_prefs.PetSize * dpi);
            int petH = (int)Math.Round(petW * 9.0 / 16.0);
            float canvasTop = Math.Max(0f, Height - petH);
            lock (_hitLock)
            {
                if (!_petVisualRect.IsEmpty && _petVisualRect.Height > 40)
                {
                    canvasTop = _petVisualRect.Top;
                    petH = _petVisualRect.Height;
                }
            }
            return canvasTop + petH * 0.14f;
        }

        private void ClampIntoScreen()
        {
            int cx = (int)Math.Round(_fx + Width / 2f);
            int footY = (int)Math.Round(_fy + Height - 20f);
            Rectangle wa = Screen.FromPoint(new Point(cx, footY)).WorkingArea;
            float petTopOff = GetPetModelTopOffset();
            _fx = Math.Max(wa.Left - Width / 4f, Math.Min(wa.Right - Width * 0.75f, _fx));
            _fy = Math.Max(wa.Top - petTopOff, Math.Min(wa.Bottom - Height, _fy));
        }

        private void SaveCurrentPos()
        {
            _prefs.SavedX = (int)Math.Round(_fx);
            _prefs.SavedY = (int)Math.Round(_fy);
            _prefs.Save(_baseDir);
        }

        private void ShowQuotaBalance()
        {
            EvalJs("window.__petApi && window.__petApi.playBalance(" + _lastQuotaUsedPct + ", " + MiniJson.Stringify(_lastQuotaSummary ?? "", false) + ");");
            AssertTopMostNow();
        }

        private void OnTapResolveTick(object sender, EventArgs e)
        {
            _tapResolveTimer.Stop();
            int count = _tapCount;
            _tapCount = 0;
            if (count == 2)
            {
                ShowQuotaBalance();
            }
        }

        private void ReturnToCorner()
        {
            _tapResolveTimer.Stop();
            _tapCount = 0;
            _throwing = false;
            _throwPrevGrounded = false;
            _roamActive = false;
            if (!_dragging) SetMotionActive(false);
            Rectangle wa = Screen.PrimaryScreen != null ? Screen.PrimaryScreen.WorkingArea : new Rectangle(0, 0, 1280, 800);
            _fx = wa.Right - Width - 16;
            _fy = wa.Bottom - Height - 2;
            MoveWindowFast(_fx, _fy);
            SaveCurrentPos();
            EvalJs("window.__petApi && window.__petApi.setThrowing(false); window.__petApi && window.__petApi.setFacing(false); window.__petApi && window.__petApi.squash(0.66);");
            AssertTopMostNow();
        }

        private void OnPetMouseDown(object sender, MouseEventArgs e)
        {
            string hit = HitKindAt(e.Location);
            if (e.Button == MouseButtons.Right)
            {
                if (hit == "bubble")
                {
                    if (OnTaskDismissed != null) OnTaskDismissed("", 0, false);
                    return;
                }
                ShowDynamicContextMenu();
                return;
            }
            if (e.Button != MouseButtons.Left) return;

            if (hit == "bubble")
            {
                _bubbleMouseDown = true;
                ForwardMouseToWeb(NativePetWin32.MOUSE_MOVE, e.Location);
                ForwardMouseToWeb(NativePetWin32.MOUSE_LDOWN, e.Location);
                return;
            }

            if (hit != "pet") return;
            bool wasThrowing = _throwing;
            double downNow = NowMs();
            float grabSpeed = wasThrowing ? (float)Math.Sqrt(_vx * _vx + _vy * _vy) : 0f;

            _airCatchScored = false;
            _slingshotMode = false;
            if (wasThrowing && grabSpeed >= 380f)
            {
                _airCatchScored = true;
                int score = Math.Max(1, (int)Math.Round((grabSpeed / 100.0) * (462.0 / Math.Max(120, _prefs.PetSize))));
                bool isNewRecord = score > _prefs.BestCatchScore;
                if (isNewRecord)
                {
                    _prefs.BestCatchScore = score;
                    _prefs.Save(_baseDir);
                }
                _lastPetDownMs = 0;
                EvalJs(string.Format(
                    System.Globalization.CultureInfo.InvariantCulture,
                    "window.__petApi && window.__petApi.onAirCatchScore({0},{1},{2},{3:0},{4},{5},{6});",
                    e.Location.X, e.Location.Y, score, grabSpeed, _prefs.PetSize,
                    isNewRecord ? "true" : "false", _prefs.BestCatchScore));
            }
            else if (_prefs.SlingshotEnabled && !_isSleeping && (downNow - _lastPetDownMs) > 40.0 && (downNow - _lastPetDownMs) < 360.0)
            {
                _slingshotMode = true;
                _lastPetDownMs = 0;
            }
            else
            {
                _lastPetDownMs = downNow;
            }

            _dragging = true;
            _lifted = false;
            _throwing = false;
            _throwPrevGrounded = false;
            _roamActive = false;
            _dragTargetX = _fx;
            _dragTargetY = _fy;
            _dragVx = 0f;
            _dragVy = 0f;
            _dragStartScreen = Cursor.Position;
            _dragStartFormX = _fx;
            _dragStartFormY = _fy;
            _trail.Clear();
            _trail.Add(Tuple.Create(_dragStartScreen.X, _dragStartScreen.Y, downNow));
            Capture = true;
            SetClickThrough(false);
            if (wasThrowing)
            {
                SetMotionActive(false);
                EvalJs("window.__petApi && window.__petApi.setThrowing(false);");
            }
        }

        private void OnPetMouseMove(object sender, MouseEventArgs e)
        {
            if (_bubbleMouseDown || HitKindAt(e.Location) == "bubble")
            {
                ForwardMouseToWeb(NativePetWin32.MOUSE_MOVE, e.Location);
            }
            if (!_dragging) return;

            Point cur = Cursor.Position;
            double now = NowMs();
            _trail.Add(Tuple.Create(cur.X, cur.Y, now));
            while (_trail.Count > 2 && now - _trail[0].Item3 > 200.0) _trail.RemoveAt(0);

            int dx = cur.X - _dragStartScreen.X;
            int dy = cur.Y - _dragStartScreen.Y;
            if (!_lifted && Math.Sqrt(dx * dx + dy * dy) < 5.0) return;

            if (!_lifted)
            {
                _lifted = true;
                _tapResolveTimer.Stop();
                _tapCount = 0;
                _dragVx = 0f;
                _dragVy = 0f;
                if (!_slingshotMode)
                {
                    EvalJs("window.__petApi && window.__petApi.setDragging(true);");
                    SetMotionActive(true);
                }
            }

            if (_slingshotMode)
            {
                float pullDist = (float)Math.Sqrt(dx * dx + dy * dy);
                float maxPull = Math.Max(140f, _prefs.PetSize * 0.72f);
                float pct = Math.Min(100f, (pullDist / maxPull) * 100f);
                EvalJs(string.Format(
                    System.Globalization.CultureInfo.InvariantCulture,
                    "window.__petApi && window.__petApi.setSlingshot(true,{0},{1},{2:0});",
                    dx, dy, pct));
                return;
            }
            _dragTargetX = _dragStartFormX + dx;
            _dragTargetY = _dragStartFormY + dy;
        }

        private void OnPetMouseUp(object sender, MouseEventArgs e)
        {
            if (_bubbleMouseDown)
            {
                _bubbleMouseDown = false;
                ForwardMouseToWeb(NativePetWin32.MOUSE_LUP, e.Location);
                EvalJs("window.__petApi && window.__petApi.handleBubbleClick(" + e.Location.X + "," + e.Location.Y + ");");
                return;
            }
            if (!_dragging) return;
            bool wasLifted = _lifted;
            bool wasSlingshot = _slingshotMode;
            bool wasAirCatch = _airCatchScored;
            _dragging = false;
            _lifted = false;
            _slingshotMode = false;
            _airCatchScored = false;
            _dragVx = 0f;
            _dragVy = 0f;
            Capture = false;
            double now = NowMs();

            if (wasSlingshot)
            {
                EvalJs("window.__petApi && window.__petApi.setSlingshot(false,0,0,0);");
                Point cur = Cursor.Position;
                float pullX = cur.X - _dragStartScreen.X;
                float pullY = cur.Y - _dragStartScreen.Y;
                float dist = (float)Math.Sqrt(pullX * pullX + pullY * pullY);
                if (wasLifted && dist >= 18f)
                {
                    float power = Math.Max(0.2f, Math.Min(3.0f, _prefs.ThrowPower));
                    float maxPull = Math.Max(140f, _prefs.PetSize * 0.72f);
                    float ratio = Math.Min(1.35f, dist / maxPull);
                    float speed = (780f + ratio * 2350f) * power;
                    _vx = (-pullX / dist) * speed;
                    _vy = (-pullY / dist) * speed;
                    _throwing = true;
                    _throwPrevGrounded = false;
                    _throwLockedArea = Screen.FromPoint(new Point((int)Math.Round(_fx + Width / 2f), (int)Math.Round(_fy + Height - 20f))).WorkingArea;
                    SetClickThrough(false);
                    SetMotionActive(true);
                    EvalJs("window.__petApi && window.__petApi.setFacing(" + (_vx > 0 ? "true" : "false") + "); window.__petApi && window.__petApi.setThrowing(true);");
                    _trail.Clear();
                    return;
                }
            }

            if (!wasLifted)
            {
                SetMotionActive(false);
                if (wasAirCatch)
                {
                    _tapResolveTimer.Stop();
                    _tapCount = 0;
                    AssertTopMostNow();
                    return;
                }
                Point curTap = Cursor.Position;
                bool withinChain = _lastTapUpMs > 0
                    && (now - _lastTapUpMs) <= 420.0
                    && Math.Abs(curTap.X - _lastTapScreen.X) <= 28
                    && Math.Abs(curTap.Y - _lastTapScreen.Y) <= 28;
                if (!withinChain) _tapCount = 0;
                _tapCount++;
                _lastTapUpMs = now;
                _lastTapScreen = curTap;

                if (_tapCount == 1)
                {
                    _tapResolveTimer.Stop();
                    EvalJs("window.__petApi && window.__petApi.onPoke(false);");
                    NativePetWin32.BringAntigravityToFront();
                    AssertTopMostNow();
                    return;
                }
                if (_tapCount == 2)
                {
                    _tapResolveTimer.Stop();
                    _tapResolveTimer.Start();
                    AssertTopMostNow();
                    return;
                }
                _tapResolveTimer.Stop();
                _tapCount = 0;
                _lastTapUpMs = 0;
                ReturnToCorner();
                return;
            }

            // dsh-pet release velocity estimator: stale pause > 150ms drops gently;
            // blend endpoint average + filtered segment peak (dt >= 8ms) with smooth soft-clamp cap
            bool launchedThrow = false;
            if (_trail.Count >= 2 && (now - _trail[_trail.Count - 1].Item3) <= 150.0)
            {
                int startIdx = -1;
                for (int i = 0; i < _trail.Count; i++)
                {
                    if (now - _trail[i].Item3 <= 150.0)
                    {
                        startIdx = i;
                        break;
                    }
                }
                if (startIdx >= 0 && startIdx < _trail.Count - 1)
                {
                    Tuple<int, int, double> first = _trail[startIdx];
                    Tuple<int, int, double> last = _trail[_trail.Count - 1];
                    double spanMs = last.Item3 - first.Item3;
                    if (spanMs >= 20.0)
                    {
                        float baseVx = (float)(((last.Item1 - first.Item1) / spanMs) * 1000.0);
                        float baseVy = (float)(((last.Item2 - first.Item2) / spanMs) * 1000.0);
                        float baseSpd = (float)Math.Sqrt(baseVx * baseVx + baseVy * baseVy);
                        if (baseSpd > 1e-3f)
                        {
                            float peakSpd = baseSpd;
                            int px = first.Item1;
                            int py = first.Item2;
                            double pt = first.Item3;
                            for (int i = startIdx + 1; i < _trail.Count; i++)
                            {
                                double segDt = _trail[i].Item3 - pt;
                                if (segDt >= 8.0)
                                {
                                    float sdx = _trail[i].Item1 - px;
                                    float sdy = _trail[i].Item2 - py;
                                    float segSpd = (float)((Math.Sqrt(sdx * sdx + sdy * sdy) / segDt) * 1000.0);
                                    if (segSpd > peakSpd) peakSpd = segSpd;
                                    px = _trail[i].Item1;
                                    py = _trail[i].Item2;
                                    pt = _trail[i].Item3;
                                }
                            }
                            float rawSpd = 0.5f * baseSpd + 0.5f * peakSpd;
                            if (rawSpd > 460f)
                            {
                                float power = Math.Max(0.2f, Math.Min(3.0f, _prefs.ThrowPower));
                                float softCap = 2200f * power;
                                float clamped = softCap * (float)(1.0 - Math.Exp(-(rawSpd * power) / Math.Max(400f, softCap)));
                                _vx = (baseVx / baseSpd) * clamped;
                                _vy = (baseVy / baseSpd) * clamped;
                                _throwing = true;
                                _throwPrevGrounded = false;
                                _throwLockedArea = Screen.FromPoint(new Point((int)Math.Round(_fx + Width / 2f), (int)Math.Round(_fy + Height - 20f))).WorkingArea;
                                SetClickThrough(false);
                                SetMotionActive(true);
                                // Keep drag/airborne video intact without 160ms crossfade ghosting or mid-air squash
                                EvalJs("window.__petApi && window.__petApi.setThrowing(true);");
                                launchedThrow = true;
                            }
                        }
                    }
                }
            }
            _trail.Clear();
            if (launchedThrow) return;

            SetMotionActive(false);
            ClampIntoScreen();
            MoveWindowFast(_fx, _fy);
            SaveCurrentPos();
            EvalJs("window.__petApi && window.__petApi.setDragging(false);");
            AssertTopMostNow();
        }

        private void ForwardMouseToWeb(int kind, Point pt)
        {
            if (_compCtrl == null) return;
            try
            {
                _compCtrl.SendMouseInput(kind, 0, 0, new NativePetWin32.POINT { X = pt.X, Y = pt.Y });
            }
            catch { }
        }

        private void StepMotionFrame()
        {
            double now = NowMs();
            float dt = (float)Math.Min(0.05, Math.Max(0.001, (now - _lastMotionMs) / 1000.0));
            _lastMotionMs = now;

            // 1. Overdamped spring drag-follow (or rigid 1:1 follow when DragSpring is off)
            if (_dragging && _lifted)
            {
                if (_prefs.DragSpring)
                {
                    float sdt = Math.Min(dt, 1f / 30f);
                    float ax = DragSpringK * (_dragTargetX - _fx) - DragSpringC * _dragVx;
                    float ay = DragSpringK * (_dragTargetY - _fy) - DragSpringC * _dragVy;
                    _dragVx += ax * sdt;
                    _dragVy += ay * sdt;
                    _fx += _dragVx * sdt;
                    _fy += _dragVy * sdt;
                }
                else
                {
                    _fx = _dragTargetX;
                    _fy = _dragTargetY;
                    _dragVx = 0f;
                    _dragVy = 0f;
                }
                MoveWindowFast(_fx, _fy);
                return;
            }

            // 2. Throw physics with sub-stepping (dsh-pet feel, single SetWindowPos per VSync frame)
            if (_throwing)
            {
                float gravity = Math.Max(0f, _prefs.Gravity);
                float restitution = Math.Max(0f, Math.Min(0.99f, _prefs.Restitution));
                float friction = Math.Max(0f, _prefs.Friction);
                bool zeroG = gravity < 1f;
                bool ceilingBounce = _prefs.CeilingBounce || zeroG;

                float speed = (float)Math.Sqrt(_vx * _vx + _vy * _vy);
                int substeps = 1;
                float travel = speed * dt;
                if (travel > 8f)
                {
                    substeps = Math.Min(16, (int)Math.Ceiling(travel / 8f));
                }
                float subDt = dt / substeps;
                float fallingVy = _vy;
                bool bouncedFloor = false;
                bool groundedNow = false;
                int wallFaceDir = 0; // -1 left, +1 right, 0 unchanged
                float floorMaxY = 0f;

                for (int step = 0; step < substeps; step++)
                {
                    int curCenterX = (int)Math.Round(_fx + Width / 2f);
                    int curFootY = (int)Math.Round(_fy + Height - 20f);
                    Rectangle wa = !_prefs.AllowCrossScreen && !_throwLockedArea.IsEmpty
                        ? _throwLockedArea
                        : Screen.FromPoint(new Point(curCenterX, curFootY)).WorkingArea;

                    float bodyPad = Width * 0.25f;
                    float minX = wa.Left - bodyPad + 4f;
                    float maxX = wa.Right - Width + bodyPad - 4f;

                    if (zeroG)
                    {
                        float airDamp = (float)Math.Exp(-0.22f * subDt);
                        _vx *= airDamp;
                        _vy *= airDamp;
                    }
                    else
                    {
                        _vy += gravity * subDt;
                    }
                    _fx += _vx * subDt;
                    _fy += _vy * subDt;

                    int nextCenterX = (int)Math.Round(_fx + Width / 2f);
                    int nextFootY = (int)Math.Round(_fy + Height - 20f);

                    if (_fx < minX)
                    {
                        bool canCrossLeft = _prefs.AllowCrossScreen && HasNeighborScreenHorizontal(nextCenterX - 10, nextFootY);
                        if (!canCrossLeft)
                        {
                            _fx = minX;
                            _vx = Math.Abs(_vx) * restitution;
                            wallFaceDir = 1;
                        }
                    }
                    else if (_fx > maxX)
                    {
                        bool canCrossRight = _prefs.AllowCrossScreen && HasNeighborScreenHorizontal(nextCenterX + 10, nextFootY);
                        if (!canCrossRight)
                        {
                            _fx = maxX;
                            _vx = -Math.Abs(_vx) * restitution;
                            wallFaceDir = -1;
                        }
                    }

                    Rectangle floorWa = !_prefs.AllowCrossScreen && !_throwLockedArea.IsEmpty
                        ? _throwLockedArea
                        : Screen.FromPoint(new Point((int)Math.Round(_fx + Width / 2f), (int)Math.Round(_fy + Height - 20f))).WorkingArea;
                    float floorMinY = floorWa.Top - GetPetModelTopOffset();
                    floorMaxY = floorWa.Bottom - Height - 2f;

                    if (_fy < floorMinY)
                    {
                        Rectangle upperWa;
                        bool canCrossUp = _prefs.AllowCrossScreen && TryFindWorkAreaAt((int)Math.Round(_fx + Width / 2f), floorWa.Top - 20, out upperWa);
                        if (!canCrossUp && ceilingBounce)
                        {
                            _fy = floorMinY;
                            _vy = Math.Abs(_vy) * restitution;
                        }
                    }
                    else if (_fy >= floorMaxY)
                    {
                        Rectangle lowerWa;
                        bool canCrossDown = _prefs.AllowCrossScreen && TryFindWorkAreaAt((int)Math.Round(_fx + Width / 2f), floorWa.Bottom + 20, out lowerWa);
                        if (!canCrossDown)
                        {
                            if (!bouncedFloor && _vy > 0f) fallingVy = Math.Max(fallingVy, _vy);
                            _fy = floorMaxY;
                            bouncedFloor = true;
                            groundedNow = true;
                            if (Math.Abs(_vy) < 48f) { _vy = 0f; _vx *= (float)Math.Exp(-friction * subDt); }
                            else { _vy = -Math.Abs(_vy) * restitution; _vx *= (float)Math.Exp(-friction * 0.35f * subDt); }
                        }
                    }
                }

                MoveWindowFast(_fx, _fy);

                if (wallFaceDir != 0)
                {
                    EvalJs("window.__petApi && window.__petApi.setFacing(" + (wallFaceDir > 0 ? "true" : "false") + ");");
                }
                // Landing squash only on airborne -> grounded transition frame (exact dsh-pet behavior)
                if (bouncedFloor && groundedNow && !_throwPrevGrounded && fallingVy > 260f)
                {
                    float t = Math.Min(1f, Math.Max(0f, (fallingVy - 260f) / 1240f));
                    float sq = Math.Max(0.58f, 0.84f - t * 0.26f);
                    EvalJs("window.__petApi && window.__petApi.squash(" + sq.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture) + ");");
                }
                _throwPrevGrounded = groundedNow || (_fy >= floorMaxY - 1.0f);

                bool atRest = zeroG
                    ? (Math.Sqrt(_vx * _vx + _vy * _vy) < 18.0)
                    : (_fy >= floorMaxY - 0.8f && Math.Abs(_vy) < 12f && Math.Abs(_vx) < 18f);
                if (atRest)
                {
                    _throwing = false;
                    _throwPrevGrounded = false;
                    _throwLockedArea = Rectangle.Empty;
                    SetMotionActive(false);
                    SaveCurrentPos();
                    EvalJs("window.__petApi && window.__petApi.setThrowing(false);");
                    AssertTopMostNow();
                }
                return;
            }

            // 3. Autonomous roaming smooth glide on native VSync
            if (_roamActive && !_dragging)
            {
                if (now >= _roamEndAtMs)
                {
                    _fx = _roamTargetX;
                    _roamActive = false;
                    SetMotionActive(false);
                    MoveWindowFast(_fx, _fy);
                    SaveCurrentPos();
                }
                else if (now >= _roamStartAtMs)
                {
                    float p = (float)((now - _roamStartAtMs) / Math.Max(1.0, _roamEndAtMs - _roamStartAtMs));
                    if (p < 0f) p = 0f;
                    if (p > 1f) p = 1f;
                    // C1-continuous trapezoidal velocity profile: 12% smooth ramp-up, 76% constant stride speed, 12% natural deceleration
                    const float a = 0.12f;
                    const float v = 1f / (1f - a);
                    float s;
                    if (p < a) s = (v * p * p) / (2f * a);
                    else if (p <= 1f - a) s = v * (p - a * 0.5f);
                    else { float q = 1f - p; s = 1f - (v * q * q) / (2f * a); }
                    _fx = _roamStartX + (_roamTargetX - _roamStartX) * s;
                    MoveWindowFast(_fx, _fy);
                }
                return;
            }

            SetMotionActive(false);
        }

        private void OnPhysicsAndPointerTick(object sender, EventArgs e)
        {
            if (!Visible || IsDisposed) return;

            // Dynamic pixel-accurate transparent click-through (skip toggling during active throw to prevent DWM flicker)
            if (_menuOpen)
            {
                // Keep pet window click-through while context menu / submenus are open so it never blocks menu selection
                SetClickThrough(true);
                if (_hoveringPet)
                {
                    _hoveringPet = false;
                    EvalJs("window.__petApi && window.__petApi.setHover(false,0,0);");
                }
                if (_hoveringBubble)
                {
                    _hoveringBubble = false;
                    ForwardMouseToWeb(NativePetWin32.MOUSE_LEAVE, new Point(0, 0));
                    EvalJs("window.__petApi && window.__petApi.clearBubbleHover && window.__petApi.clearBubbleHover();");
                }
            }
            else if (_dragging || _throwing || _bubbleMouseDown || _inputFocusActive)
            {
                SetClickThrough(false);
                if (_hoveringPet)
                {
                    _hoveringPet = false;
                    EvalJs("window.__petApi && window.__petApi.setHover(false,0,0);");
                }
                if ((_dragging || _throwing) && _hoveringBubble)
                {
                    _hoveringBubble = false;
                    ForwardMouseToWeb(NativePetWin32.MOUSE_LEAVE, new Point(0, 0));
                    EvalJs("window.__petApi && window.__petApi.clearBubbleHover && window.__petApi.clearBubbleHover();");
                }
            }
            else
            {
                Point screenPt = Cursor.Position;
                Point clientPt = new Point(screenPt.X - Left, screenPt.Y - Top);
                string hit = HitKindAt(clientPt);
                bool inside = !string.IsNullOrEmpty(hit);
                SetClickThrough(!inside);
                if (inside)
                {
                    Cursor = Cursors.Hand;
                }
                bool hoverBubble = (hit == "bubble");
                if (hoverBubble)
                {
                    _hoveringBubble = true;
                }
                else if (_hoveringBubble)
                {
                    _hoveringBubble = false;
                    ForwardMouseToWeb(NativePetWin32.MOUSE_LEAVE, new Point(0, 0));
                    EvalJs("window.__petApi && window.__petApi.clearBubbleHover && window.__petApi.clearBubbleHover();");
                }
                bool hoverPet = (hit == "pet");
                if (hoverPet != _hoveringPet || (hoverPet && (Math.Abs(clientPt.X - _lastHoverX) > 4 || Math.Abs(clientPt.Y - _lastHoverY) > 4)))
                {
                    _hoveringPet = hoverPet;
                    _lastHoverX = clientPt.X;
                    _lastHoverY = clientPt.Y;
                    EvalJs("window.__petApi && window.__petApi.setHover(" + (hoverPet ? "true" : "false") + "," + clientPt.X + "," + clientPt.Y + ");");
                }
                // Hover hotkeys (dsh-pet style): while cursor hovers over pet and no modifier key is pressed
                bool modDown = (NativePetWin32.GetAsyncKeyState(0x11) & 0x8000) != 0
                            || (NativePetWin32.GetAsyncKeyState(0x12) & 0x8000) != 0
                            || (NativePetWin32.GetAsyncKeyState(0x5B) & 0x8000) != 0;
                bool curS = hoverPet && !modDown && (NativePetWin32.GetAsyncKeyState('S') & 0x8000) != 0;
                bool curD = hoverPet && !modDown && (NativePetWin32.GetAsyncKeyState('D') & 0x8000) != 0;
                bool curW = hoverPet && !modDown && (NativePetWin32.GetAsyncKeyState('W') & 0x8000) != 0;
                bool curC = hoverPet && !modDown && (NativePetWin32.GetAsyncKeyState('C') & 0x8000) != 0;
                if (curS && !_prevKeyS) EvalJs("window.__petApi && window.__petApi.toggleSleep();");
                if (curD && !_prevKeyD) EvalJs("window.__petApi && window.__petApi.toggleTodoPanel();");
                if (curW && !_prevKeyW) EvalJs("window.__petApi && window.__petApi.showWeather(true);");
                if (curC && !_prevKeyC) EvalJs("window.__petApi && window.__petApi.triggerChatter();");
                _prevKeyS = curS;
                _prevKeyD = curD;
                _prevKeyW = curW;
                _prevKeyC = curC;
            }
        }

        private ContextMenuStrip BuildMenu()
        {
            ContextMenuStrip m = new ContextMenuStrip();

            ToolStripMenuItem sizeMenu = new ToolStripMenuItem("📐 宠物大小");
            int[] sizes = new int[] { 220, 270, 320, 380, 440 };
            string[] sizeNames = new string[] { "小巧 (220px)", "适中 (270px)", "标准 (320px)", "大号 (380px)", "超大 (440px)" };
            for (int i = 0; i < sizes.Length; i++)
            {
                int sz = sizes[i];
                ToolStripMenuItem item = new ToolStripMenuItem(sizeNames[i]);
                item.Tag = sz;
                item.Click += (s, e) =>
                {
                    _prefs.PetSize = sz;
                    _prefs.Save(_baseDir);
                    UpdateWindowMetrics(true);
                    PushPrefsToWeb();
                    SaveCurrentPos();
                    AssertTopMostNow();
                };
                _sizeMenuItems.Add(item);
                sizeMenu.DropDownItems.Add(item);
            }
            m.Items.Add(sizeMenu);

            _userTitleRootMenuItem = new ToolStripMenuItem("👑 称呼设置");
            string[] titlePresets = new string[] { "老大", "主人", "老板", "大人", "老师", "大佬", "伙伴", "朋友" };
            for (int i = 0; i < titlePresets.Length; i++)
            {
                string preset = titlePresets[i];
                string label = i == 0 ? preset + "（默认）" : preset;
                ToolStripMenuItem tItem = new ToolStripMenuItem(label);
                tItem.Tag = preset;
                tItem.Click += (s, e) =>
                {
                    _prefs.UserTitle = preset;
                    _prefs.Save(_baseDir);
                    PushPrefsToWeb();
                    EvalJs("window.__petApi && window.__petApi.showNotice(" + MiniJson.Stringify("收到！以后我就叫你" + preset + "啦✦", false) + ", 'ciallo');");
                };
                _userTitleMenuItems.Add(tItem);
                _userTitleRootMenuItem.DropDownItems.Add(tItem);
            }
            _userTitleRootMenuItem.DropDownItems.Add(new ToolStripSeparator());
            _userTitleCustomMenuItem = new ToolStripMenuItem("✏️ 自定义称呼...");
            _userTitleCustomMenuItem.Click += (s, e) =>
            {
                string cur = string.IsNullOrWhiteSpace(_prefs.UserTitle) ? "老大" : _prefs.UserTitle;
                string val = PromptSimpleInput("自定义对你的称呼", "输入希望宠物对你的称呼（最多 16 字，留空恢复默认「老大」）：", cur);
                if (val != null)
                {
                    string next = val.Trim();
                    if (string.IsNullOrEmpty(next)) next = "老大";
                    if (next.Length > 16) next = next.Substring(0, 16);
                    _prefs.UserTitle = next;
                    _prefs.Save(_baseDir);
                    PushPrefsToWeb();
                    EvalJs("window.__petApi && window.__petApi.showNotice(" + MiniJson.Stringify("收到！以后我就叫你" + next + "啦✦", false) + ", 'ciallo');");
                }
            };
            _userTitleRootMenuItem.DropDownItems.Add(_userTitleCustomMenuItem);
            m.Items.Add(_userTitleRootMenuItem);

            ToolStripMenuItem actMenu = new ToolStripMenuItem("🎭 动作点播");
            actMenu.DropDownItems.Add("✨ 恢复智能随动", null, (s, e) => EvalJs("window.__petApi && window.__petApi.playAction('');"));
            actMenu.DropDownItems.Add(new ToolStripSeparator());

            Tuple<string, string[]>[] groups = new Tuple<string, string[]>[]
            {
                Tuple.Create("👆 点击回应", new string[] {
                    "点击回应-开心跃动", "点击回应-元气挥手", "点击回应-害羞惊讶", "点击回应-傲娇生气", "点击回应-挠痒咯咯笑"
                }),
                Tuple.Create("🚶 走路与移动", new string[] {
                    "侧身急躁跑", "开心小跑", "螃蟹走路", "原地左转奔跑", "原地漂浮踏步", "东张西望"
                }),
                Tuple.Create("💼 工作状态", new string[] {
                    "工作状态-思考冒泡", "工作状态-忙碌点按", "工作状态-清点归档", "工作状态-原地踱步张望",
                    "工作状态-雀跃庆祝", "工作状态-垂头叹气冒汗", "写代码"
                }),
                Tuple.Create("🌙 睡觉与碎碎念", new string[] {
                    "睡觉-开始", "睡觉-循环", "睡觉-起来",
                    "碎碎念-擦桌碎碎念", "碎碎念-发呆碎碎念", "碎碎念-对屏碎碎念",
                    "是啊，吃什么", "深度思考碎碎念"
                }),
                Tuple.Create("💰 额度与钱包", new string[] {
                    "余额-钱袋满溢", "余额-金袋叮当", "余额-钱袋如常", "余额-数金皱眉", "余额-袋空如洗", "余额-分文不剩"
                }),
                Tuple.Create("✨ 日常小动作", new string[] {
                    "待机呼吸休闲", "悠闲哼歌", "超大伸懒腰", "原地敲击桌面互动", "原地重力下蹲压缩",
                    "哈欠连天", "原地小憩沉眠", "女仆屈膝礼仪", "被吓一跳", "小幅度原地360度旋转展示",
                    "偷吃零食被抓住", "用鲸鱼尾巴拍打地面", "打瞌睡被惊醒", "照镜子", "整体换装试色",
                    "轻快记录", "摇扇纳凉", "晨间刷牙"
                }),
                Tuple.Create("🎮 玩耍与才艺", new string[] {
                    "原地专心玩魔方", "原地蹲下玩玩具汽车", "鲸鱼吐泡泡特效", "原地跳跃抓碎头顶物品",
                    "玩游戏气急败坏", "玩水枪", "小提琴演奏", "蓝鲸现世", "优雅女仆舞", "轻快摇摆舞",
                    "可爱宅舞", "吹气球", "动物环绕", "放风筝", "拆礼物", "变鸽子", "扑克魔术",
                    "抽陀螺", "吹笛子", "蝴蝶蜜蜂环绕头顶开花", "撸猫", "凭空生花", "骑木马",
                    "三球抛接", "踢毽子", "下五子棋", "荡秋千"
                }),
                Tuple.Create("🍚 干饭与零食", new string[] {
                    "吃白饭", "吃饭·碗饭", "吃饭团", "期待开饭", "吃早餐", "吃午餐", "吃晚餐",
                    "大口吃零食", "吃Token", "吃冰淇淋融化", "吃大闸蟹", "吃糖葫芦", "吃长寿面",
                    "吃西瓜", "涮火锅"
                }),
                Tuple.Create("🏮 时节与节日", new string[] {
                    "被落叶淹没", "插茱萸赏菊", "中秋赏月吃月饼", "堆雪人", "放烟花", "吃粽子",
                    "吃年糕", "吃青团", "吃腊八粥", "吃重阳糕", "收红包", "写福字", "穿针乞巧",
                    "舞狮头", "讨糖南瓜灯", "放河灯", "萌化小幽灵", "装点圣诞树", "放孔明灯",
                    "吃汤圆", "吃饺子"
                }),
            };
            HashSet<string> listed = new HashSet<string>(StringComparer.Ordinal);
            listed.Add("被鼠标拖拽悬空反馈");
            foreach (Tuple<string, string[]> g in groups)
            {
                ToolStripMenuItem sub = new ToolStripMenuItem(g.Item1);
                foreach (string name in g.Item2)
                {
                    listed.Add(name);
                    string animName = name;
                    sub.DropDownItems.Add(animName, null, (s, e) => EvalJs("window.__petApi && window.__petApi.playAction(" + MiniJson.Stringify(animName, false) + ");"));
                }
                actMenu.DropDownItems.Add(sub);
            }
            // Dynamically expose any extra custom .webm files added to anims/webm/
            List<string> allWebms = _server.ListWebmNames();
            List<string> customWebms = new List<string>();
            for (int i = 0; i < allWebms.Count; i++)
            {
                if (!listed.Contains(allWebms[i])) customWebms.Add(allWebms[i]);
            }
            if (customWebms.Count > 0)
            {
                ToolStripMenuItem customSub = new ToolStripMenuItem("🧩 自定义扩展");
                for (int i = 0; i < customWebms.Count; i++)
                {
                    string animName = customWebms[i];
                    customSub.DropDownItems.Add(animName, null, (s, e) => EvalJs("window.__petApi && window.__petApi.playAction(" + MiniJson.Stringify(animName, false) + ");"));
                }
                actMenu.DropDownItems.Add(customSub);
            }
            m.Items.Add(actMenu);

            _sleepMenuItem = new ToolStripMenuItem("🌙 哄她睡觉 (悬停按 S)");
            _sleepMenuItem.Click += (s, e) => EvalJs("window.__petApi && window.__petApi.toggleSleep();");
            m.Items.Add(_sleepMenuItem);

            m.Items.Add("🌤️ 查询当前天气 (悬停按 W)", null, (s, e) => EvalJs("window.__petApi && window.__petApi.showWeather(true);"));
            m.Items.Add("📝 头顶待办清单 (悬停按 D)", null, (s, e) => EvalJs("window.__petApi && window.__petApi.toggleTodoPanel();"));
            m.Items.Add("💰 看看额度用量 (双击宠物)", null, (s, e) => ShowQuotaBalance());
            m.Items.Add("💬 聊一句 & 发贴图 (悬停按 C)", null, (s, e) => EvalJs("window.__petApi && window.__petApi.triggerChatter();"));
            m.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem styleMenu = new ToolStripMenuItem("🎨 外观与趣味体验");
            ToolStripMenuItem fontSub = new ToolStripMenuItem("🔤 气泡字体");
            string[] fontIds = new string[] { "youyuan", "yahei", "kaiti", "comic" };
            string[] fontLabels = new string[] { "幼圆体（圆润可爱·默认）", "微软雅黑", "楷体（温润优雅）", "漫画体" };
            for (int i = 0; i < fontIds.Length; i++)
            {
                string fid = fontIds[i];
                ToolStripMenuItem fItem = new ToolStripMenuItem(fontLabels[i]);
                fItem.Tag = fid;
                fItem.Click += (s, e) =>
                {
                    _prefs.FontFamily = fid;
                    _prefs.Save(_baseDir);
                    PushPrefsToWeb();
                };
                _fontMenuItems.Add(fItem);
                fontSub.DropDownItems.Add(fItem);
            }
            styleMenu.DropDownItems.Add(fontSub);

            _clickSoundMenuItem = new ToolStripMenuItem("🔊 Q 弹点击音效");
            _clickSoundMenuItem.Click += (s, e) => { _prefs.ClickSoundEnabled = !_prefs.ClickSoundEnabled; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            styleMenu.DropDownItems.Add(_clickSoundMenuItem);

            _slingshotMenuItem = new ToolStripMenuItem("🏹 双击弹弓蓄力发射");
            _slingshotMenuItem.Click += (s, e) => { _prefs.SlingshotEnabled = !_prefs.SlingshotEnabled; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            styleMenu.DropDownItems.Add(_slingshotMenuItem);

            styleMenu.DropDownItems.Add("📍 设置天气城市（解决代理偏移）", null, (s, e) =>
            {
                string val = PromptSimpleInput("设置天气城市", "输入城市名（如 上海、深圳、杭州；留空则按出口 IP 自动定位）：", _prefs.WeatherCity ?? "");
                if (val != null)
                {
                    _prefs.WeatherCity = val.Trim();
                    _prefs.Save(_baseDir);
                    PushPrefsToWeb();
                    EvalJs("window.__petApi && window.__petApi.showWeather(true);");
                }
            });
            styleMenu.DropDownItems.Add("🏷️ 修改宠物昵称", null, (s, e) =>
            {
                string val = PromptSimpleInput("修改宠物昵称", "输入新的宠物昵称（悬停小名牌显示）：", _prefs.PetName ?? "星璃喵");
                if (!string.IsNullOrWhiteSpace(val))
                {
                    _prefs.PetName = val.Trim();
                    _prefs.Save(_baseDir);
                    PushPrefsToWeb();
                }
            });

            styleMenu.DropDownItems.Add(new ToolStripSeparator());
            _bestScoreMenuItem = new ToolStripMenuItem("🏆 空中抓取最高分：0 分");
            _bestScoreMenuItem.Enabled = false;
            styleMenu.DropDownItems.Add(_bestScoreMenuItem);
            m.Items.Add(styleMenu);

            _workAnimMenuItem = new ToolStripMenuItem("💼 工作状态联动动画");
            _workAnimMenuItem.Click += (s, e) => { _prefs.WorkAnimEnabled = !_prefs.WorkAnimEnabled; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            m.Items.Add(_workAnimMenuItem);

            _autoPlayMenuItem = new ToolStripMenuItem("🐾 自动随机小剧场");
            _autoPlayMenuItem.Click += (s, e) => { _prefs.AutoPlay = !_prefs.AutoPlay; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            m.Items.Add(_autoPlayMenuItem);

            _fixedMenuItem = new ToolStripMenuItem("📍 固定位置 (不自己漫游转向)");
            _fixedMenuItem.Click += (s, e) => { _prefs.Fixed = !_prefs.Fixed; _roamActive = false; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            m.Items.Add(_fixedMenuItem);

            _crossScreenMenuItem = new ToolStripMenuItem("🖥️ 允许跨屏投掷与漫游");
            _crossScreenMenuItem.Click += (s, e) => { _prefs.AllowCrossScreen = !_prefs.AllowCrossScreen; _prefs.Save(_baseDir); };
            m.Items.Add(_crossScreenMenuItem);

            ToolStripMenuItem physicsMenu = new ToolStripMenuItem("🎯 投掷与物理设置");

            ToolStripMenuItem powerSub = new ToolStripMenuItem("⚡ 投掷力度");
            float[] powerVals = new float[] { 0.6f, 1.0f, 1.4f, 2.0f };
            string[] powerNames = new string[] { "轻柔 (0.6×)", "标准 (1.0×)", "强劲 (1.4×)", "超猛 (2.0×)" };
            for (int i = 0; i < powerVals.Length; i++)
            {
                float pv = powerVals[i];
                ToolStripMenuItem item = new ToolStripMenuItem(powerNames[i]);
                item.Tag = pv;
                item.Click += (s, e) => { _prefs.ThrowPower = pv; _prefs.Save(_baseDir); };
                _throwPowerMenuItems.Add(item);
                powerSub.DropDownItems.Add(item);
            }
            physicsMenu.DropDownItems.Add(powerSub);

            ToolStripMenuItem gravSub = new ToolStripMenuItem("🌍 重力大小");
            float[] gravVals = new float[] { 0f, 500f, 1400f, 2400f };
            string[] gravNames = new string[] { "失重漂浮 (0)", "月球低重 (500)", "标准地球 (1400)", "沉重快落 (2400)" };
            for (int i = 0; i < gravVals.Length; i++)
            {
                float gv = gravVals[i];
                ToolStripMenuItem item = new ToolStripMenuItem(gravNames[i]);
                item.Tag = gv;
                item.Click += (s, e) => { _prefs.Gravity = gv; _prefs.Save(_baseDir); };
                _gravityMenuItems.Add(item);
                gravSub.DropDownItems.Add(item);
            }
            physicsMenu.DropDownItems.Add(gravSub);

            ToolStripMenuItem bounceSub = new ToolStripMenuItem("🏀 弹性系数");
            float[] bounceVals = new float[] { 0.20f, 0.50f, 0.78f, 0.95f };
            string[] bounceNames = new string[] { "不弹 (0.20)", "微弹 (0.50)", "Q弹标准 (0.78)", "超级弹球 (0.95)" };
            for (int i = 0; i < bounceVals.Length; i++)
            {
                float bv = bounceVals[i];
                ToolStripMenuItem item = new ToolStripMenuItem(bounceNames[i]);
                item.Tag = bv;
                item.Click += (s, e) => { _prefs.Restitution = bv; _prefs.Save(_baseDir); };
                _restitutionMenuItems.Add(item);
                bounceSub.DropDownItems.Add(item);
            }
            physicsMenu.DropDownItems.Add(bounceSub);

            ToolStripMenuItem fricSub = new ToolStripMenuItem("🧊 地面摩擦");
            float[] fricVals = new float[] { 0.4f, 1.2f, 2.5f, 6.0f };
            string[] fricNames = new string[] { "冰面滑行 (0.4)", "顺滑 (1.2)", "标准 (2.5)", "防滑急停 (6.0)" };
            for (int i = 0; i < fricVals.Length; i++)
            {
                float fv = fricVals[i];
                ToolStripMenuItem item = new ToolStripMenuItem(fricNames[i]);
                item.Tag = fv;
                item.Click += (s, e) => { _prefs.Friction = fv; _prefs.Save(_baseDir); };
                _frictionMenuItems.Add(item);
                fricSub.DropDownItems.Add(item);
            }
            physicsMenu.DropDownItems.Add(fricSub);

            physicsMenu.DropDownItems.Add(new ToolStripSeparator());

            _dragSpringMenuItem = new ToolStripMenuItem("🧲 拖拽弹性跟手 (关则刚性直跟)");
            _dragSpringMenuItem.Click += (s, e) => { _prefs.DragSpring = !_prefs.DragSpring; _prefs.Save(_baseDir); };
            physicsMenu.DropDownItems.Add(_dragSpringMenuItem);

            _ceilingBounceMenuItem = new ToolStripMenuItem("🧱 顶部天花板反弹");
            _ceilingBounceMenuItem.Click += (s, e) => { _prefs.CeilingBounce = !_prefs.CeilingBounce; _prefs.Save(_baseDir); };
            physicsMenu.DropDownItems.Add(_ceilingBounceMenuItem);

            physicsMenu.DropDownItems.Add(new ToolStripSeparator());
            physicsMenu.DropDownItems.Add("↩️ 恢复默认物理参数", null, (s, e) =>
            {
                _prefs.ResetPhysicsDefaults();
                _prefs.Save(_baseDir);
            });

            m.Items.Add(physicsMenu);

            _chatterMenuItem = new ToolStripMenuItem("💬 随机气泡碎碎念");
            _chatterMenuItem.Click += (s, e) => { _prefs.ChatterEnabled = !_prefs.ChatterEnabled; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            m.Items.Add(_chatterMenuItem);

            _taskBubbleMenuItem = new ToolStripMenuItem("📋 任务进度气泡与提醒");
            _taskBubbleMenuItem.Click += (s, e) => { _prefs.TaskBubbleEnabled = !_prefs.TaskBubbleEnabled; _prefs.Save(_baseDir); PushPrefsToWeb(); };
            m.Items.Add(_taskBubbleMenuItem);

            _topMostMenuItem = new ToolStripMenuItem("🔝 始终保持置顶显示");
            _topMostMenuItem.Click += (s, e) =>
            {
                _prefs.TopMost = !_prefs.TopMost;
                _prefs.Save(_baseDir);
                TopMost = _prefs.TopMost;
                AssertTopMostNow();
            };
            m.Items.Add(_topMostMenuItem);

            _agyFastMenuItem = new ToolStripMenuItem("⚡ agy-fast 加速插件（减轮次省额度）");
            _agyFastMenuItem.Click += (s, e) =>
            {
                bool targetEnable = !AgyFastHelper.IsEnabled();
                string bundledDir = Path.Combine(_baseDir, "plugins", "agy-fast");
                string msg;
                bool ok = AgyFastHelper.SetEnabled(targetEnable, bundledDir, out msg);
                if (!string.IsNullOrEmpty(msg))
                {
                    EvalJs("window.__petApi && window.__petApi.showNotice(" + MiniJson.Stringify(msg, false) + ", " + MiniJson.Stringify(ok ? "ciallo" : "oops", false) + ");");
                }
            };
            m.Items.Add(_agyFastMenuItem);

            m.Items.Add(new ToolStripSeparator());
            m.Items.Add("📂 打开动画素材目录 (可放新 .webm)", null, (s, e) =>
            {
                try
                {
                    Directory.CreateDirectory(_server.WebmDir);
                    Process.Start("explorer.exe", _server.WebmDir);
                }
                catch { }
            });
            m.Items.Add("🏠 回到屏幕右下角 (三击宠物)", null, (s, e) => ReturnToCorner());
            m.Items.Add("🚀 切回 Antigravity", null, (s, e) => NativePetWin32.BringAntigravityToFront());
            _updateMenuItem = new ToolStripMenuItem("🆕 检查在线更新 (轻量热更)");
            _updateMenuItem.Click += (s, e) => OnUpdateMenuClicked();
            m.Items.Add(_updateMenuItem);
            m.Items.Add("🔄 重启宠物 (热更新生效)", null, (s, e) => RestartPetProcess());
            m.Items.Add("🙈 暂时隐藏桌面宠物", null, (s, e) =>
            {
                _userHidden = true;
                Hide();
                if (OnDesktopVisibilityChanged != null) OnDesktopVisibilityChanged(false);
            });
            AttachTopMostToSubMenus(m.Items);
            return m;
        }

        private string ReadInstalledVersion()
        {
            try
            {
                string mf = Path.Combine(_baseDir, "manifest.json");
                if (File.Exists(mf))
                {
                    Dictionary<string, object> obj = MiniJson.ParseObject(File.ReadAllText(mf, Encoding.UTF8));
                    if (obj != null && obj.ContainsKey("version") && obj["version"] != null)
                    {
                        string v = Convert.ToString(obj["version"]).Trim().TrimStart('v', 'V');
                        if (!string.IsNullOrEmpty(v)) return v;
                    }
                }
            }
            catch { }
            return "2.0.0";
        }

        private static int CompareSemVer(string a, string b)
        {
            string sa = (a ?? "").Trim().TrimStart('v', 'V');
            string sb = (b ?? "").Trim().TrimStart('v', 'V');
            int dashA = sa.IndexOf('-');
            if (dashA >= 0) sa = sa.Substring(0, dashA);
            int dashB = sb.IndexOf('-');
            if (dashB >= 0) sb = sb.Substring(0, dashB);
            string[] pa = sa.Split('.');
            string[] pb = sb.Split('.');
            int n = Math.Max(pa.Length, pb.Length);
            for (int i = 0; i < n; i++)
            {
                int va = 0;
                int vb = 0;
                if (i < pa.Length) int.TryParse(pa[i], out va);
                if (i < pb.Length) int.TryParse(pb[i], out vb);
                if (va != vb) return va.CompareTo(vb);
            }
            return 0;
        }

        private void ScheduleDailyUpdateCheck()
        {
            if (!_prefs.AutoCheckUpdates) return;
            string today = DateTime.Now.ToString("yyyy-MM-dd");
            if (string.Equals(_prefs.LastUpdateCheckDate, today, StringComparison.Ordinal)) return;
            string lowerBase = (_baseDir ?? "").ToLowerInvariant();
            if (lowerBase.IndexOf("\\temp\\", StringComparison.Ordinal) >= 0) return;

            Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(25000).ConfigureAwait(false);
                    if (IsDisposed) return;
                    _prefs.LastUpdateCheckDate = today;
                    _prefs.Save(_baseDir);
                    await CheckForUpdateAsync(false).ConfigureAwait(false);
                }
                catch { }
            });
        }

        private void OnUpdateMenuClicked()
        {
            if (_updateChecking || _updateDownloading) return;
            string curVer = ReadInstalledVersion();
            if (!string.IsNullOrEmpty(_latestUpdateVersion) && !string.IsNullOrEmpty(_latestUpdateUrl) && CompareSemVer(_latestUpdateVersion, curVer) > 0)
            {
                DownloadAndApplyUpdate();
                return;
            }
            Task.Run(() => CheckForUpdateAsync(true));
        }

        private void ShowPetNoticeSafe(string text, string meme)
        {
            try
            {
                if (IsDisposed || !IsHandleCreated) return;
                BeginInvoke((Action)(() =>
                {
                    if (!IsDisposed)
                    {
                        EvalJs("window.__petApi && window.__petApi.showNotice(" + MiniJson.Stringify(text ?? "", false) + ", " + MiniJson.Stringify(meme ?? "ciallo", false) + ");");
                    }
                }));
            }
            catch { }
        }

        private async Task CheckForUpdateAsync(bool manual)
        {
            if (_updateChecking || _updateDownloading) return;
            _updateChecking = true;
            if (manual) ShowPetNoticeSafe("正在检查 AGY Pet 最新版本…", "cute");
            try
            {
                try { ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12; } catch { }
                string curVer = ReadInstalledVersion();
                using (HttpClient http = new HttpClient())
                {
                    http.Timeout = TimeSpan.FromSeconds(12);
                    http.DefaultRequestHeaders.Add("User-Agent", "AGY-Pet/" + curVer);
                    http.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
                    string json = await http.GetStringAsync("https://api.github.com/repos/Mexix-Collab/agy-pet/releases/latest").ConfigureAwait(false);
                    Dictionary<string, object> rel = MiniJson.ParseObject(json);
                    if (rel == null) throw new Exception("无效响应");

                    string tag = rel.ContainsKey("tag_name") ? Convert.ToString(rel["tag_name"]) : "";
                    string latestVer = (tag ?? "").Trim().TrimStart('v', 'V');
                    string htmlUrl = rel.ContainsKey("html_url") ? Convert.ToString(rel["html_url"]) : _latestReleasePageUrl;

                    string coreName = "";
                    string coreUrl = "";
                    long coreSize = 0;
                    string fullName = "";
                    string fullUrl = "";
                    long fullSize = 0;
                    string shaUrl = "";

                    List<object> assets = rel.ContainsKey("assets") ? (rel["assets"] as List<object>) : null;
                    if (assets != null)
                    {
                        for (int i = 0; i < assets.Count; i++)
                        {
                            Dictionary<string, object> a = assets[i] as Dictionary<string, object>;
                            if (a == null) continue;
                            string aname = a.ContainsKey("name") ? Convert.ToString(a["name"]) : "";
                            string aurl = a.ContainsKey("browser_download_url") ? Convert.ToString(a["browser_download_url"]) : "";
                            long asize = 0;
                            if (a.ContainsKey("size") && a["size"] != null) long.TryParse(Convert.ToString(a["size"]), out asize);
                            if (string.IsNullOrEmpty(aname) || string.IsNullOrEmpty(aurl)) continue;

                            if (aname.IndexOf("-Core-Windows-x64.exe", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                coreName = aname;
                                coreUrl = aurl;
                                coreSize = asize;
                            }
                            else if (aname.IndexOf("-Windows-x64.exe", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                fullName = aname;
                                fullUrl = aurl;
                                fullSize = asize;
                            }
                            else if (string.Equals(aname, "SHA256SUMS.txt", StringComparison.OrdinalIgnoreCase))
                            {
                                shaUrl = aurl;
                            }
                        }
                    }

                    string pickName = !string.IsNullOrEmpty(coreUrl) ? coreName : fullName;
                    string pickUrl = !string.IsNullOrEmpty(coreUrl) ? coreUrl : fullUrl;
                    long pickSize = !string.IsNullOrEmpty(coreUrl) ? coreSize : fullSize;

                    if (!string.IsNullOrEmpty(latestVer) && CompareSemVer(latestVer, curVer) > 0 && !string.IsNullOrEmpty(pickUrl))
                    {
                        _latestUpdateVersion = latestVer;
                        _latestUpdateAssetName = pickName;
                        _latestUpdateUrl = pickUrl;
                        _latestUpdateSize = pickSize;
                        _latestSha256Url = shaUrl;
                        if (!string.IsNullOrEmpty(htmlUrl)) _latestReleasePageUrl = htmlUrl;

                        string szStr = pickSize > 0 ? string.Format("{0:0.0} MB", pickSize / (1024.0 * 1024.0)) : "轻量包";
                        ShowPetNoticeSafe(
                            string.Format("发现新版本 v{0} ({1}) ✦\n右键点击「立即更新」3 秒无损升级，保留全部动画！", latestVer, szStr),
                            "ciallo");
                        if (manual)
                        {
                            BeginInvoke((Action)(() => DownloadAndApplyUpdate()));
                        }
                    }
                    else if (manual)
                    {
                        ShowPetNoticeSafe(string.Format("当前已是最新版 v{0} ✦ 无需更新~", curVer), "ciallo");
                    }
                }
            }
            catch (Exception ex)
            {
                WritePetLog("CheckForUpdateAsync failed: " + ex.Message);
                if (manual)
                {
                    ShowPetNoticeSafe("检查更新失败，请确认网络可访问 GitHub Releases", "oops");
                }
            }
            finally
            {
                _updateChecking = false;
            }
        }

        private void DownloadAndApplyUpdate()
        {
            if (_updateDownloading || string.IsNullOrEmpty(_latestUpdateUrl)) return;
            string ver = _latestUpdateVersion;
            string assetName = _latestUpdateAssetName;
            string dlUrl = _latestUpdateUrl;
            string shaUrl = _latestSha256Url;
            string szStr = _latestUpdateSize > 0
                ? string.Format("{0:0.0} MB", _latestUpdateSize / (1024.0 * 1024.0))
                : "轻量包";

            DialogResult dr = MessageBox.Show(
                string.Format(
                    "检测到 AGY Pet 新版本 v{0}（约 {1}）。\n\n点击「是」将自动下载轻量核心升级包并校验 SHA256，原地完成升级后自动重启宠物。\n\n✓ 100% 保留全部 114 段动画、自定义 .webm、称呼设置与待办记录。",
                    ver, szStr),
                "AGY Pet 在线轻量更新",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Information);
            if (dr != DialogResult.Yes) return;

            _updateDownloading = true;
            ShowPetNoticeSafe(string.Format("正在下载轻量更新包 v{0} ({1})…", ver, szStr), "cute");

            Task.Run(async () =>
            {
                string tempExe = Path.Combine(Path.GetTempPath(), "agy-pet-update-" + ver + ".exe");
                try
                {
                    try { ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12; } catch { }
                    string curVer = ReadInstalledVersion();
                    using (HttpClient http = new HttpClient())
                    {
                        http.Timeout = TimeSpan.FromMinutes(3);
                        http.DefaultRequestHeaders.Add("User-Agent", "AGY-Pet/" + curVer);

                        byte[] bin = await http.GetByteArrayAsync(dlUrl).ConfigureAwait(false);
                        File.WriteAllBytes(tempExe, bin);

                        if (!string.IsNullOrEmpty(shaUrl) && !string.IsNullOrEmpty(assetName))
                        {
                            ShowPetNoticeSafe("下载完成，正在校验 SHA256 完整性…", "cute");
                            string shaText = await http.GetStringAsync(shaUrl).ConfigureAwait(false);
                            string expectedHash = "";
                            string[] lines = shaText.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                            for (int i = 0; i < lines.Length; i++)
                            {
                                string ln = lines[i].Trim();
                                if (ln.EndsWith(assetName, StringComparison.OrdinalIgnoreCase))
                                {
                                    int sp = ln.IndexOf(' ');
                                    if (sp > 0) expectedHash = ln.Substring(0, sp).Trim().ToLowerInvariant();
                                    break;
                                }
                            }
                            if (!string.IsNullOrEmpty(expectedHash))
                            {
                                string actualHash;
                                using (SHA256 sha = SHA256.Create())
                                {
                                    byte[] digest = sha.ComputeHash(bin);
                                    StringBuilder sb = new StringBuilder(64);
                                    for (int bi = 0; bi < digest.Length; bi++) sb.Append(digest[bi].ToString("x2"));
                                    actualHash = sb.ToString();
                                }
                                if (!string.Equals(actualHash, expectedHash, StringComparison.OrdinalIgnoreCase))
                                {
                                    try { File.Delete(tempExe); } catch { }
                                    throw new Exception("SHA256 校验失败，已自动中止安装");
                                }
                            }
                        }
                    }

                    ShowPetNoticeSafe("校验通过！正在原地静默升级并重启宠物…", "ciallo");
                    SaveCurrentPos();
                    bool keepAgyFast = AgyFastHelper.IsInstalled() && AgyFastHelper.IsEnabled();
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = tempExe;
                    psi.Arguments = "--silent --no-kill-legacy "
                        + (keepAgyFast ? "--agy-fast " : "--no-agy-fast ")
                        + "--install-dir \"" + _baseDir.TrimEnd('\\') + "\"";
                    psi.WorkingDirectory = Path.GetTempPath();
                    psi.UseShellExecute = false;
                    psi.CreateNoWindow = true;
                    Process.Start(psi);
                    WritePetLog("Online core updater launched: " + tempExe + " " + psi.Arguments);
                }
                catch (Exception ex)
                {
                    WritePetLog("DownloadAndApplyUpdate failed: " + ex.Message);
                    ShowPetNoticeSafe("更新失败：" + ex.Message, "oops");
                }
                finally
                {
                    _updateDownloading = false;
                }
            });
        }

        private void RestartPetProcess()
        {
            try
            {
                SaveCurrentPos();
                string exePath = Path.Combine(_baseDir, "agy-pet-watcher.exe");
                if (!File.Exists(exePath))
                {
                    exePath = Path.Combine(_baseDir, "agy-claude-style-watcher.exe");
                }
                if (!File.Exists(exePath))
                {
                    exePath = Process.GetCurrentProcess().MainModule.FileName;
                }
                StringBuilder sb = new StringBuilder();
                sb.Append("--watch --replace");
                string[] cmdArgs = Environment.GetCommandLineArgs();
                for (int i = 1; i < cmdArgs.Length; i++)
                {
                    string a = cmdArgs[i] ?? "";
                    if (string.Equals(a, "--exit-on-host-close", StringComparison.Ordinal))
                    {
                        sb.Append(" --exit-on-host-close");
                    }
                    else if (string.Equals(a, "--cdp-port", StringComparison.Ordinal) && i + 1 < cmdArgs.Length)
                    {
                        sb.Append(" --cdp-port ").Append(cmdArgs[++i]);
                    }
                    else if (a.StartsWith("--cdp-port=", StringComparison.Ordinal))
                    {
                        sb.Append(' ').Append(a);
                    }
                }
                sb.Append(" --dir \"").Append(_baseDir.TrimEnd('\\')).Append('"');
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = exePath;
                psi.Arguments = sb.ToString();
                psi.WorkingDirectory = _baseDir;
                psi.UseShellExecute = false;
                WritePetLog("RestartPetProcess launching: " + exePath + " " + psi.Arguments);
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                WritePetLog("RestartPetProcess failed: " + ex.Message);
            }
        }

        private static string PromptSimpleInput(string title, string prompt, string defaultVal)
        {
            using (Form dlg = new Form())
            {
                dlg.Text = title;
                dlg.Width = 360;
                dlg.Height = 155;
                dlg.FormBorderStyle = FormBorderStyle.FixedDialog;
                dlg.StartPosition = FormStartPosition.CenterScreen;
                dlg.MinimizeBox = false;
                dlg.MaximizeBox = false;
                dlg.TopMost = true;

                Label lbl = new Label { Left = 14, Top = 14, Width = 318, Height = 32, Text = prompt };
                TextBox tb = new TextBox { Left = 14, Top = 50, Width = 316, Text = defaultVal ?? "" };
                Button ok = new Button { Text = "确定", Left = 172, Top = 82, Width = 74, DialogResult = DialogResult.OK };
                Button cancel = new Button { Text = "取消", Left = 256, Top = 82, Width = 74, DialogResult = DialogResult.Cancel };
                dlg.Controls.AddRange(new Control[] { lbl, tb, ok, cancel });
                dlg.AcceptButton = ok;
                dlg.CancelButton = cancel;
                return dlg.ShowDialog() == DialogResult.OK ? tb.Text : null;
            }
        }

        private void AttachTopMostToSubMenus(ToolStripItemCollection items)
        {
            if (items == null) return;
            for (int i = 0; i < items.Count; i++)
            {
                ToolStripMenuItem mi = items[i] as ToolStripMenuItem;
                if (mi == null || !mi.HasDropDownItems) continue;
                mi.DropDownOpened += (s, e) =>
                {
                    try
                    {
                        ToolStripDropDown dd = mi.DropDown;
                        if (dd != null && dd.IsHandleCreated)
                        {
                            NativePetWin32.AssertTopMost(dd.Handle, true);
                        }
                    }
                    catch { }
                };
                AttachTopMostToSubMenus(mi.DropDownItems);
            }
        }

        private void ShowDynamicContextMenu()
        {
            _menuOpen = true;
            SetClickThrough(true);
            for (int i = 0; i < _sizeMenuItems.Count; i++)
            {
                int sz = (int)_sizeMenuItems[i].Tag;
                _sizeMenuItems[i].Checked = Math.Abs(_prefs.PetSize - sz) < 15;
            }
            _workAnimMenuItem.Checked = _prefs.WorkAnimEnabled;
            _autoPlayMenuItem.Checked = _prefs.AutoPlay;
            _fixedMenuItem.Checked = _prefs.Fixed;
            int screenCount = Screen.AllScreens != null ? Screen.AllScreens.Length : 1;
            _crossScreenMenuItem.Text = screenCount > 1
                ? string.Format("🖥️ 允许跨屏投掷与漫游 (当前 {0} 块屏幕)", screenCount)
                : "🖥️ 允许跨屏投掷与漫游";
            _crossScreenMenuItem.Checked = _prefs.AllowCrossScreen;
            for (int i = 0; i < _throwPowerMenuItems.Count; i++)
            {
                float v = (float)_throwPowerMenuItems[i].Tag;
                _throwPowerMenuItems[i].Checked = Math.Abs(_prefs.ThrowPower - v) < 0.08f;
            }
            for (int i = 0; i < _gravityMenuItems.Count; i++)
            {
                float v = (float)_gravityMenuItems[i].Tag;
                _gravityMenuItems[i].Checked = Math.Abs(_prefs.Gravity - v) < 50f;
            }
            for (int i = 0; i < _restitutionMenuItems.Count; i++)
            {
                float v = (float)_restitutionMenuItems[i].Tag;
                _restitutionMenuItems[i].Checked = Math.Abs(_prefs.Restitution - v) < 0.05f;
            }
            for (int i = 0; i < _frictionMenuItems.Count; i++)
            {
                float v = (float)_frictionMenuItems[i].Tag;
                _frictionMenuItems[i].Checked = Math.Abs(_prefs.Friction - v) < 0.25f;
            }
            if (_dragSpringMenuItem != null) _dragSpringMenuItem.Checked = _prefs.DragSpring;
            if (_ceilingBounceMenuItem != null) _ceilingBounceMenuItem.Checked = _prefs.CeilingBounce;
            _chatterMenuItem.Checked = _prefs.ChatterEnabled;
            _taskBubbleMenuItem.Checked = _prefs.TaskBubbleEnabled;
            _topMostMenuItem.Checked = _prefs.TopMost;
            if (_agyFastMenuItem != null)
            {
                bool afInstalled = AgyFastHelper.IsInstalled();
                bool afEnabled = afInstalled && AgyFastHelper.IsEnabled();
                _agyFastMenuItem.Checked = afEnabled;
                _agyFastMenuItem.Text = afEnabled
                    ? "⚡ agy-fast 加速插件（已开启 · 减轮次省额度）"
                    : (afInstalled ? "⚡ agy-fast 加速插件（已关闭 · 点击开启）" : "⚡ agy-fast 加速插件（未安装 · 点击一键部署）");
            }
            if (_updateMenuItem != null)
            {
                string curVer = ReadInstalledVersion();
                if (_updateDownloading)
                {
                    _updateMenuItem.Text = "⏳ 正在下载并应用更新...";
                }
                else if (_updateChecking)
                {
                    _updateMenuItem.Text = "🔍 正在检查在线更新...";
                }
                else if (!string.IsNullOrEmpty(_latestUpdateVersion) && CompareSemVer(_latestUpdateVersion, curVer) > 0)
                {
                    string szHint = _latestUpdateSize > 0
                        ? string.Format("{0:0.0} MB", _latestUpdateSize / (1024.0 * 1024.0))
                        : "轻量包";
                    _updateMenuItem.Text = string.Format("⬆️ 立即更新到 v{0} ({1} · 保留动画)", _latestUpdateVersion, szHint);
                }
                else
                {
                    _updateMenuItem.Text = string.Format("🆕 检查在线更新 (当前 v{0})", curVer);
                }
            }
            for (int i = 0; i < _fontMenuItems.Count; i++)
            {
                string fid = Convert.ToString(_fontMenuItems[i].Tag);
                _fontMenuItems[i].Checked = string.Equals(_prefs.FontFamily, fid, StringComparison.OrdinalIgnoreCase);
            }
            if (_userTitleRootMenuItem != null)
            {
                string curTitle = string.IsNullOrWhiteSpace(_prefs.UserTitle) ? "老大" : _prefs.UserTitle;
                _userTitleRootMenuItem.Text = string.Format("👑 称呼设置（当前：{0}）", curTitle);
                bool matchedPreset = false;
                for (int i = 0; i < _userTitleMenuItems.Count; i++)
                {
                    string preset = Convert.ToString(_userTitleMenuItems[i].Tag);
                    bool hit = string.Equals(curTitle, preset, StringComparison.Ordinal);
                    _userTitleMenuItems[i].Checked = hit;
                    if (hit) matchedPreset = true;
                }
                if (_userTitleCustomMenuItem != null)
                {
                    _userTitleCustomMenuItem.Checked = !matchedPreset;
                    _userTitleCustomMenuItem.Text = matchedPreset
                        ? "✏️ 自定义称呼..."
                        : string.Format("✏️ 自定义称呼（当前：{0}）...", curTitle);
                }
            }
            if (_clickSoundMenuItem != null) _clickSoundMenuItem.Checked = _prefs.ClickSoundEnabled;
            if (_slingshotMenuItem != null) _slingshotMenuItem.Checked = _prefs.SlingshotEnabled;
            if (_bestScoreMenuItem != null)
            {
                _bestScoreMenuItem.Text = _prefs.BestCatchScore > 0
                    ? string.Format("🏆 空中抓取最高分：{0} 分", _prefs.BestCatchScore)
                    : "🏆 空中抓取最高分：抛飞再抓试试看~";
            }
            if (_sleepMenuItem != null)
            {
                _sleepMenuItem.Text = _isSleeping ? "☀️ 叫醒小猫 (悬停按 S)" : "🌙 哄她睡觉 (悬停按 S)";
            }
            _menu.Show(Cursor.Position);
            try
            {
                if (_menu.IsHandleCreated)
                {
                    NativePetWin32.AssertTopMost(_menu.Handle, true);
                    NativePetWin32.SetForegroundWindow(_menu.Handle);
                }
            }
            catch { }
        }

        public void ApplyTelemetry(NekoTelemetryState next)
        {
            if (next == null) return;
            _telemetry = next;
            if (next.QuotaUsedPct >= 0 && next.QuotaUsedPct <= 100)
            {
                _lastQuotaUsedPct = next.QuotaUsedPct;
            }
            if (!string.IsNullOrEmpty(next.QuotaSummary))
            {
                _lastQuotaSummary = next.QuotaSummary;
            }
            if (!next.Enabled)
            {
                if (Visible)
                {
                    WritePetLog("Hide() called because Telemetry.Enabled=false");
                    Hide();
                }
                return;
            }
            if (!_userHidden && !Visible)
            {
                WritePetLog("Show() called because Telemetry.Enabled=true");
                Show();
                AssertTopMostNow();
            }
            PushTelemetryToWeb();
            AssertTopMostNow();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            WritePetLog(string.Format("FormClosing reason={0} cancel={1} disposed={2}", e.CloseReason, e.Cancel, IsDisposed));
            base.OnFormClosing(e);
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            WritePetLog(string.Format("FormClosed reason={0}", e.CloseReason));
            base.OnFormClosed(e);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _vsyncStop = true;
                _vsyncRunning = false;
                try { _vsyncWake.Set(); } catch { }
                try { if (_vsyncThread != null && _vsyncThread.IsAlive) _vsyncThread.Join(300); } catch { }
                try { _vsyncWake.Dispose(); } catch { }
                try { _tickTimer.Stop(); _tickTimer.Dispose(); } catch { }
                try { _topmostTimer.Stop(); _topmostTimer.Dispose(); } catch { }
                try { _tapResolveTimer.Stop(); _tapResolveTimer.Dispose(); } catch { }
                try { _menu.Dispose(); } catch { }
                try { if (_ctrl2 != null) _ctrl2.Close(); } catch { }
            }
            base.Dispose(disposing);
        }
    }

    internal sealed class DesktopNekoHost : IDisposable
    {
        private readonly Thread _uiThread;
        private readonly ManualResetEventSlim _ready = new ManualResetEventSlim(false);
        private readonly PetAssetServer _server;
        private readonly object _syncLock = new object();
        private sealed class DismissedTaskState
        {
            public int Steps;
            public bool WasRunning;
        }

        private sealed class KnownStageInfo
        {
            public string StageLabel = "";
            public List<string> DetailLines = new List<string>();
            public DateTime UpdatedUtc = DateTime.MinValue;
        }

        private readonly Dictionary<string, List<NekoTaskItem>> _sourceTasks = new Dictionary<string, List<NekoTaskItem>>(StringComparer.Ordinal);
        private readonly Dictionary<string, DismissedTaskState> _dismissedTasks = new Dictionary<string, DismissedTaskState>(StringComparer.Ordinal);
        private readonly Dictionary<string, string> _knownTaskTitles = new Dictionary<string, string>(StringComparer.Ordinal);
        private readonly Dictionary<string, KnownStageInfo> _knownStages = new Dictionary<string, KnownStageInfo>(StringComparer.Ordinal);
        private readonly HashSet<string> _bgSeenRunningIds = new HashSet<string>(StringComparer.Ordinal);
        private readonly System.Threading.Timer _bgTranscriptTimer;
        private int _bgPolling = 0;
        private sealed class ParentAgentMeta
        {
            public string AgentMode = "single";
            public string SwarmTitle = "";
            public int RunningCount = 0;
            public int TotalCount = 0;
            public List<string> ChildLines = new List<string>();
        }

        private Dictionary<string, string> _childToParent = new Dictionary<string, string>(StringComparer.Ordinal);
        private Dictionary<string, ParentAgentMeta> _parentAgentMeta = new Dictionary<string, ParentAgentMeta>(StringComparer.Ordinal);
        private string _lastBgSig = "";
        private bool _globalEnabled = true;
        private int _lastQuotaUsedPct = -1;
        private string _lastQuotaSummary = "";
        private WebViewPetForm _form;
        private ApplicationContext _ctx;
        private volatile bool _disposed = false;

        public bool IsPetUiAlive
        {
            get { return !_disposed && _uiThread != null && _uiThread.IsAlive && _form != null && !_form.IsDisposed; }
        }

        private DesktopNekoHost(
            string baseDir,
            bool initialEnabled,
            Action<bool> onVisibilityChanged,
            Action<string, string, string> onActivateConversation)
        {
            _globalEnabled = initialEnabled;
            _server = new PetAssetServer(baseDir);
            _uiThread = new Thread(() =>
            {
                try
                {
                    NativePetWin32.EnsurePerMonitorDpi();
                    Application.EnableVisualStyles();
                    Application.SetUnhandledExceptionMode(UnhandledExceptionMode.CatchException);
                    Application.ThreadException += (sender, exArgs) =>
                    {
                        try
                        {
                            File.AppendAllText(
                                Path.Combine(baseDir, "pet-status.log"),
                                "[" + DateTime.Now.ToString("HH:mm:ss") + "] UI ThreadException: " + exArgs.Exception + "\n",
                                new UTF8Encoding(false));
                        }
                        catch { }
                    };
                    _form = new WebViewPetForm(baseDir, _server);
                    _form.OnDesktopVisibilityChanged = onVisibilityChanged;
                    _form.OnTaskDismissed = DismissTask;
                    _form.OnActivateConversation = onActivateConversation;
                    if (initialEnabled)
                    {
                        _form.Show();
                        _form.AssertTopMostNow();
                    }
                    _ctx = new ApplicationContext(_form);
                    _ready.Set();
                    Application.Run(_ctx);
                }
                catch (Exception ex)
                {
                    try
                    {
                        File.AppendAllText(
                            Path.Combine(baseDir, "pet-status.log"),
                            "[" + DateTime.Now.ToString("HH:mm:ss") + "] UI thread crashed: " + ex + "\n",
                            new UTF8Encoding(false));
                    }
                    catch { }
                    _ready.Set();
                }
                finally
                {
                    try
                    {
                        File.AppendAllText(
                            Path.Combine(baseDir, "pet-status.log"),
                            "[" + DateTime.Now.ToString("HH:mm:ss") + "] UI thread exited\n",
                            new UTF8Encoding(false));
                    }
                    catch { }
                }
            });
            _uiThread.IsBackground = true;
            _uiThread.SetApartmentState(ApartmentState.STA);
            _uiThread.Start();
            _ready.Wait(3500);

            _bgTranscriptTimer = new System.Threading.Timer((_) => PollBackgroundTranscripts(), null, 1500, 1200);
        }

        public static DesktopNekoHost TryStart(
            string baseDir,
            bool initialEnabled = true,
            Action<bool> onVisibilityChanged = null,
            Action<string, string, string> onActivateConversation = null)
        {
            try
            {
                string webmDir = Path.Combine(baseDir, "anims", "webm");
                string htmlPath = Path.Combine(baseDir, "pet-ui.html");
                if (!Directory.Exists(webmDir) || !File.Exists(htmlPath)) return null;
                return new DesktopNekoHost(baseDir, initialEnabled, onVisibilityChanged, onActivateConversation);
            }
            catch
            {
                return null;
            }
        }

        public void RemoveSource(string sourceId)
        {
            if (_disposed || string.IsNullOrEmpty(sourceId)) return;
            // Refresh local transcript tracker first so tasks running in tray/background stay visible seamlessly after window close
            PollBackgroundTranscripts();
            lock (_syncLock)
            {
                if (!_sourceTasks.Remove(sourceId)) return;
            }
            DispatchMergedTelemetry();
        }

        private bool ShouldSkipDismissedTask(NekoTaskItem item)
        {
            if (item == null || string.IsNullOrEmpty(item.Id)) return false;
            DismissedTaskState rec;
            if (!_dismissedTasks.TryGetValue(item.Id, out rec)) return false;
            if (!rec.WasRunning)
            {
                // Previously dismissed a completed/error card: as soon as this conversation starts a new running turn, show it again immediately.
                if (item.Running)
                {
                    _dismissedTasks.Remove(item.Id);
                    return false;
                }
                return true;
            }
            if (!item.Running)
            {
                // Running turn that user explicitly hid has now finished; keep hidden for this done state, but un-dismiss when next turn starts running.
                rec.WasRunning = false;
                return true;
            }
            if (item.Steps > 0 && rec.Steps > 0 && item.Steps < rec.Steps)
            {
                // Per-turn step counter reset indicates a brand-new turn started.
                _dismissedTasks.Remove(item.Id);
                return false;
            }
            return true;
        }

        private void DismissTask(string taskId, int reportedSteps, bool reportedRunning)
        {
            if (_disposed) return;
            lock (_syncLock)
            {
                if (!string.IsNullOrEmpty(taskId))
                {
                    int maxSteps = reportedSteps;
                    bool isRunning = reportedRunning;
                    foreach (List<NekoTaskItem> list in _sourceTasks.Values)
                    {
                        for (int i = 0; i < list.Count; i++)
                        {
                            if (string.Equals(list[i].Id, taskId, StringComparison.Ordinal))
                            {
                                if (list[i].Steps > maxSteps) maxSteps = list[i].Steps;
                                if (list[i].Running) isRunning = true;
                            }
                        }
                    }
                    _dismissedTasks[taskId] = new DismissedTaskState { Steps = maxSteps, WasRunning = isRunning };
                }
                else
                {
                    foreach (List<NekoTaskItem> list in _sourceTasks.Values)
                    {
                        for (int i = 0; i < list.Count; i++)
                        {
                            NekoTaskItem cur = list[i];
                            if (string.IsNullOrEmpty(cur.Id)) continue;
                            DismissedTaskState existing;
                            if (_dismissedTasks.TryGetValue(cur.Id, out existing))
                            {
                                if (cur.Steps > existing.Steps) existing.Steps = cur.Steps;
                                if (cur.Running) existing.WasRunning = true;
                            }
                            else
                            {
                                _dismissedTasks[cur.Id] = new DismissedTaskState { Steps = cur.Steps, WasRunning = cur.Running };
                            }
                        }
                    }
                }
            }
            DispatchMergedTelemetry();
        }

        private static string ReadTailText(string filePath, int maxBytes)
        {
            try
            {
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete))
                {
                    long len = fs.Length;
                    if (len <= 0) return "";
                    long start = len > maxBytes ? len - maxBytes : 0;
                    fs.Seek(start, SeekOrigin.Begin);
                    int toRead = (int)(len - start);
                    byte[] buf = new byte[toRead];
                    int read = 0;
                    while (read < toRead)
                    {
                        int n = fs.Read(buf, read, toRead - read);
                        if (n <= 0) break;
                        read += n;
                    }
                    string text = Encoding.UTF8.GetString(buf, 0, read);
                    if (start > 0)
                    {
                        int nl = text.IndexOf('\n');
                        if (nl >= 0 && nl + 1 < text.Length) text = text.Substring(nl + 1);
                    }
                    return text;
                }
            }
            catch
            {
                return "";
            }
        }

        private static string FormatToolNameZh(string toolName)
        {
            if (string.IsNullOrEmpty(toolName)) return "后台执行中";
            string low = toolName.ToLowerInvariant();
            if (low.Contains("run_command")) return "执行命令";
            if (low.Contains("read_file") || low.Contains("view_file")) return "读取文件";
            if (low.Contains("edit_file") || low.Contains("replace_file") || low.Contains("write_file")) return "编辑代码";
            if (low.Contains("search") || low.Contains("grep") || low.Contains("find")) return "检索代码";
            if (low.Contains("browser") || low.Contains("web")) return "网页操作";
            if (low.Contains("subagent") || low.Contains("swarm")) return "子代理协作";
            return toolName;
        }

        private void PollBackgroundTranscripts()
        {
            if (_disposed || _form == null || _form.IsDisposed) return;
            if (Interlocked.Exchange(ref _bgPolling, 1) != 0) return;
            try
            {
                string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
                if (string.IsNullOrEmpty(userProfile)) return;
                string brainDir = Path.Combine(userProfile, ".gemini", "antigravity", "brain");
                if (!Directory.Exists(brainDir)) return;

                DateTime nowUtc = DateTime.UtcNow;
                bool agyAlive = CdpHelper.GetAntigravityProcessIds().Count > 0;
                StringBuilder sigSb = new StringBuilder();

                string[] dirs = Directory.GetDirectories(brainDir);

                // Phase 1: Map Swarm workers & Subagents to their parent conversation so they fold cleanly into parent cards
                Dictionary<string, string> childToParent = new Dictionary<string, string>(StringComparer.Ordinal);
                Dictionary<string, string> childRoleLabels = new Dictionary<string, string>(StringComparer.Ordinal);
                HashSet<string> swarmParents = new HashSet<string>(StringComparer.Ordinal);
                HashSet<string> multiParents = new HashSet<string>(StringComparer.Ordinal);
                Dictionary<string, string> swarmTitles = new Dictionary<string, string>(StringComparer.Ordinal);
                Dictionary<string, int> swarmMemberTotal = new Dictionary<string, int>(StringComparer.Ordinal);

                for (int d = 0; d < dirs.Length; d++)
                {
                    string pCid = Path.GetFileName(dirs[d]);
                    if (string.IsNullOrEmpty(pCid) || pCid.Length < 16) continue;
                    string sysGen = Path.Combine(dirs[d], ".system_generated");
                    if (!Directory.Exists(sysGen)) continue;

                    string swarmDir = Path.Combine(sysGen, "swarm");
                    if (Directory.Exists(swarmDir))
                    {
                        string swarmJson = Path.Combine(swarmDir, "swarm.json");
                        string membersJson = Path.Combine(swarmDir, "members.json");
                        if (File.Exists(swarmJson) || File.Exists(membersJson))
                        {
                            swarmParents.Add(pCid);
                            if (File.Exists(membersJson))
                            {
                                try
                                {
                                    string mRaw = File.ReadAllText(membersJson, Encoding.UTF8);
                                    Dictionary<string, object> mRoot = MiniJson.ParseObject(mRaw);
                                    if (mRoot != null)
                                    {
                                        if (mRoot.ContainsKey("title"))
                                        {
                                            string st = Convert.ToString(mRoot["title"]).Trim();
                                            if (!string.IsNullOrEmpty(st)) swarmTitles[pCid] = st;
                                        }
                                        Dictionary<string, object> membersDict = mRoot.ContainsKey("members") ? mRoot["members"] as Dictionary<string, object> : null;
                                        if (membersDict != null)
                                        {
                                            int workerCount = 0;
                                            foreach (KeyValuePair<string, object> mkv in membersDict)
                                            {
                                                Dictionary<string, object> md = mkv.Value as Dictionary<string, object>;
                                                if (md == null) continue;
                                                string mRole = md.ContainsKey("role") ? Convert.ToString(md["role"]) : "";
                                                string mCid = md.ContainsKey("conversation_id") ? Convert.ToString(md["conversation_id"]).Trim() : "";
                                                bool killed = md.ContainsKey("killed") && Equals(md["killed"], true);
                                                if (!string.IsNullOrEmpty(mCid) && !string.Equals(mCid, pCid, StringComparison.Ordinal) &&
                                                    !string.Equals(mRole, "coordinator", StringComparison.OrdinalIgnoreCase))
                                                {
                                                    childToParent[mCid] = pCid;
                                                    if (!string.IsNullOrEmpty(mkv.Key)) childRoleLabels[mCid] = mkv.Key;
                                                    if (!killed) workerCount++;
                                                }
                                            }
                                            if (workerCount > 0) swarmMemberTotal[pCid] = workerCount;
                                        }
                                    }
                                }
                                catch { }
                            }
                        }
                    }

                    string subDir = Path.Combine(sysGen, "subagents");
                    if (Directory.Exists(subDir))
                    {
                        try
                        {
                            string[] subFiles = Directory.GetFiles(subDir, "*.json");
                            if (subFiles.Length > 0)
                            {
                                multiParents.Add(pCid);
                                for (int sf = 0; sf < subFiles.Length; sf++)
                                {
                                    string cCid = Path.GetFileNameWithoutExtension(subFiles[sf]);
                                    if (string.IsNullOrEmpty(cCid) || cCid.Length < 16 || string.Equals(cCid, pCid, StringComparison.Ordinal)) continue;
                                    childToParent[cCid] = pCid;
                                    if (!childRoleLabels.ContainsKey(cCid))
                                    {
                                        try
                                        {
                                            string sRaw = File.ReadAllText(subFiles[sf], Encoding.UTF8);
                                            Dictionary<string, object> sObj = MiniJson.ParseObject(sRaw);
                                            Dictionary<string, object> desc = (sObj != null && sObj.ContainsKey("subagentDescriptor"))
                                                ? sObj["subagentDescriptor"] as Dictionary<string, object>
                                                : null;
                                            string role = desc != null && desc.ContainsKey("role") ? Convert.ToString(desc["role"]).Trim() : "";
                                            if (role.StartsWith("Swarm Worker (", StringComparison.OrdinalIgnoreCase) && role.EndsWith(")", StringComparison.Ordinal))
                                            {
                                                role = role.Substring("Swarm Worker (".Length, role.Length - "Swarm Worker (".Length - 1).Trim();
                                            }
                                            if (!string.IsNullOrEmpty(role)) childRoleLabels[cCid] = role;
                                        }
                                        catch { }
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                }

                // Compress multi-hop descendant chains (e.g. grandchild subagent -> child subagent -> root conversation)
                // directly onto the top-level root conversation so nested subagent/swarm progress is never dropped.
                if (childToParent.Count > 0)
                {
                    Dictionary<string, string> resolvedRoot = new Dictionary<string, string>(StringComparer.Ordinal);
                    foreach (KeyValuePair<string, string> kv in childToParent)
                    {
                        string cur = kv.Value;
                        HashSet<string> visited = new HashSet<string>(StringComparer.Ordinal);
                        visited.Add(kv.Key);
                        while (!string.IsNullOrEmpty(cur) && !visited.Contains(cur))
                        {
                            visited.Add(cur);
                            string nextParent;
                            if (childToParent.TryGetValue(cur, out nextParent) && !string.IsNullOrEmpty(nextParent))
                            {
                                cur = nextParent;
                            }
                            else
                            {
                                break;
                            }
                        }
                        if (!string.IsNullOrEmpty(cur) && !string.Equals(cur, kv.Key, StringComparison.Ordinal))
                        {
                            resolvedRoot[kv.Key] = cur;
                        }
                    }
                    childToParent = resolvedRoot;

                    // Propagate swarm/multi parent flags upward to the resolved top-level root
                    List<string> extraSwarmRoots = new List<string>();
                    foreach (string sp in swarmParents)
                    {
                        string r;
                        if (childToParent.TryGetValue(sp, out r) && !string.IsNullOrEmpty(r)) extraSwarmRoots.Add(r);
                    }
                    for (int ei = 0; ei < extraSwarmRoots.Count; ei++) swarmParents.Add(extraSwarmRoots[ei]);

                    List<string> extraMultiRoots = new List<string>();
                    foreach (string mp in multiParents)
                    {
                        string r;
                        if (childToParent.TryGetValue(mp, out r) && !string.IsNullOrEmpty(r)) extraMultiRoots.Add(r);
                    }
                    for (int ei = 0; ei < extraMultiRoots.Count; ei++) multiParents.Add(extraMultiRoots[ei]);
                }

                // Phase 2: Parse recent active transcripts
                Dictionary<string, NekoTaskItem> parsedItemsByCid = new Dictionary<string, NekoTaskItem>(StringComparer.Ordinal);
                for (int d = 0; d < dirs.Length; d++)
                {
                    string cid = Path.GetFileName(dirs[d]);
                    if (string.IsNullOrEmpty(cid) || cid.Length < 16) continue;
                    string logPath = Path.Combine(dirs[d], ".system_generated", "logs", "transcript.jsonl");
                    if (!File.Exists(logPath)) continue;

                    DateTime mtimeUtc;
                    try { mtimeUtc = File.GetLastWriteTimeUtc(logPath); }
                    catch { continue; }

                    double ageSec = (nowUtc - mtimeUtc).TotalSeconds;
                    if (ageSec > 1800) continue;

                    string tail = ReadTailText(logPath, 524288);
                    if (string.IsNullOrEmpty(tail)) continue;
                    string[] rawLines = tail.Split(new char[] { '\n' }, StringSplitOptions.RemoveEmptyEntries);
                    if (rawLines.Length == 0) continue;

                    int lastUserIdx = -1;
                    List<Dictionary<string, object>> parsed = new List<Dictionary<string, object>>();
                    for (int i = 0; i < rawLines.Length; i++)
                    {
                        string ln = rawLines[i].Trim();
                        if (ln.Length < 2 || ln[0] != '{') continue;
                        try
                        {
                            Dictionary<string, object> obj = MiniJson.ParseObject(ln);
                            if (obj != null)
                            {
                                parsed.Add(obj);
                                string tp = obj.ContainsKey("type") ? Convert.ToString(obj["type"]) : "";
                                if (string.Equals(tp, "USER_INPUT", StringComparison.Ordinal))
                                {
                                    string src = obj.ContainsKey("source") ? Convert.ToString(obj["source"]) : "";
                                    string uContent = obj.ContainsKey("content") ? Convert.ToString(obj["content"]) : "";
                                    bool isSystemOnly = string.Equals(src, "SYSTEM", StringComparison.OrdinalIgnoreCase) ||
                                                        (uContent.IndexOf("<SYSTEM_MESSAGE>", StringComparison.OrdinalIgnoreCase) >= 0 &&
                                                         uContent.IndexOf("<USER_REQUEST>", StringComparison.OrdinalIgnoreCase) < 0);
                                    if (!isSystemOnly)
                                    {
                                        lastUserIdx = parsed.Count - 1;
                                    }
                                }
                            }
                        }
                        catch { }
                    }
                    if (parsed.Count == 0) continue;

                    int startIdx = lastUserIdx >= 0 ? lastUserIdx + 1 : 0;
                    int turnSteps = 0;
                    DateTime turnStartUtc = mtimeUtc;
                    DateTime lastStepUtc = mtimeUtc;
                    string userPromptTitle = "";
                    string lastType = "";
                    string lastStatus = "";
                    bool lastHasTools = false;
                    string lastToolLabel = "";
                    bool hasRunningToolStep = false;
                    HashSet<string> pendingBgTaskIds = new HashSet<string>(StringComparer.Ordinal);
                    Dictionary<string, string> bgTimerConditions = new Dictionary<string, string>(StringComparer.Ordinal);
                    Queue<string> pendingScheduleConds = new Queue<string>();
                    List<string> detailLines = new List<string>();
                    List<Tuple<string, string>> planSteps = new List<Tuple<string, string>>();
                    string currentFocus = "";

                    if (lastUserIdx >= 0)
                    {
                        Dictionary<string, object> uObj = parsed[lastUserIdx];
                        if (uObj.ContainsKey("created_at"))
                        {
                            DateTime dt;
                            if (DateTime.TryParse(Convert.ToString(uObj["created_at"]), out dt)) turnStartUtc = dt.ToUniversalTime();
                        }
                        if (uObj.ContainsKey("content"))
                        {
                            string rawC = Convert.ToString(uObj["content"]);
                            int reqStart = rawC.IndexOf("<USER_REQUEST>", StringComparison.OrdinalIgnoreCase);
                            if (reqStart >= 0)
                            {
                                int bodyStart = reqStart + "<USER_REQUEST>".Length;
                                int reqEnd = rawC.IndexOf("</USER_REQUEST>", bodyStart, StringComparison.OrdinalIgnoreCase);
                                rawC = reqEnd > bodyStart ? rawC.Substring(bodyStart, reqEnd - bodyStart) : rawC.Substring(bodyStart);
                            }
                            string c = rawC.Replace("\r", " ").Replace("\n", " ").Trim();
                            if (c.Length > 28) c = c.Substring(0, 27) + "…";
                            userPromptTitle = c;
                        }
                    }

                    for (int i = startIdx; i < parsed.Count; i++)
                    {
                        Dictionary<string, object> obj = parsed[i];
                        string tp = obj.ContainsKey("type") ? Convert.ToString(obj["type"]) : "";
                        string st = obj.ContainsKey("status") ? Convert.ToString(obj["status"]) : "";
                        string contentStr = obj.ContainsKey("content") ? Convert.ToString(obj["content"]) : "";
                        if (obj.ContainsKey("created_at"))
                        {
                            DateTime dt;
                            if (DateTime.TryParse(Convert.ToString(obj["created_at"]), out dt)) lastStepUtc = dt.ToUniversalTime();
                        }
                        if (string.Equals(tp, "PLANNER_RESPONSE", StringComparison.Ordinal))
                        {
                            // Once a subsequent PLANNER_RESPONSE arrives, any earlier non-background tool step has finished
                            hasRunningToolStep = false;
                            pendingScheduleConds.Clear();
                        }
                        bool isBgLaunchStep = false;
                        if (!string.IsNullOrEmpty(contentStr))
                        {
                            if (!string.Equals(tp, "PLANNER_RESPONSE", StringComparison.Ordinal))
                            {
                                if (contentStr.IndexOf("No background tasks are currently running", StringComparison.OrdinalIgnoreCase) >= 0)
                                {
                                    pendingBgTaskIds.Clear();
                                    bgTimerConditions.Clear();
                                }
                                int bgIdx = contentStr.IndexOf("Command is running as a background task with task id:", StringComparison.OrdinalIgnoreCase);
                                int markerLen = "Command is running as a background task with task id:".Length;
                                if (bgIdx < 0)
                                {
                                    bgIdx = contentStr.IndexOf("Tool is running as a background task with task id:", StringComparison.OrdinalIgnoreCase);
                                    markerLen = "Tool is running as a background task with task id:".Length;
                                }
                                if (bgIdx >= 0 && bgIdx < 220)
                                {
                                    string after = contentStr.Substring(bgIdx + markerLen).TrimStart();
                                    int endPos = 0;
                                    while (endPos < after.Length && (char.IsLetterOrDigit(after[endPos]) || after[endPos] == '-' || after[endPos] == '_' || after[endPos] == '/' || after[endPos] == '.')) endPos++;
                                    if (endPos >= 4)
                                    {
                                        string newBgId = after.Substring(0, endPos);
                                        pendingBgTaskIds.Add(newBgId);
                                        if (pendingScheduleConds.Count > 0)
                                        {
                                            string cond = pendingScheduleConds.Dequeue();
                                            if (!string.IsNullOrEmpty(cond) && !string.Equals(cond, "never", StringComparison.OrdinalIgnoreCase))
                                            {
                                                bgTimerConditions[newBgId] = cond;
                                            }
                                        }
                                        isBgLaunchStep = true;
                                    }
                                }
                            }
                            if (string.Equals(tp, "SYSTEM_MESSAGE", StringComparison.Ordinal) || contentStr.IndexOf("<SYSTEM_MESSAGE>", StringComparison.Ordinal) >= 0)
                            {
                                List<string> resolvedIds = new List<string>();
                                const string senderMarker = "sender=";
                                int sIdx = contentStr.IndexOf(senderMarker, StringComparison.Ordinal);
                                if (sIdx >= 0)
                                {
                                    string afterS = contentStr.Substring(sIdx + senderMarker.Length);
                                    int sEnd = 0;
                                    while (sEnd < afterS.Length && !char.IsWhiteSpace(afterS[sEnd]) && afterS[sEnd] != ')' && afterS[sEnd] != ']' && afterS[sEnd] != ':') sEnd++;
                                    if (sEnd > 0)
                                    {
                                        string sid = afterS.Substring(0, sEnd);
                                        pendingBgTaskIds.Remove(sid);
                                        resolvedIds.Add(sid);
                                    }
                                }
                                const string tidMarker = "Task id \"";
                                int tIdx = contentStr.IndexOf(tidMarker, StringComparison.Ordinal);
                                if (tIdx >= 0)
                                {
                                    string afterT = contentStr.Substring(tIdx + tidMarker.Length);
                                    int qEnd = afterT.IndexOf('"');
                                    if (qEnd > 0)
                                    {
                                        string tid = afterT.Substring(0, qEnd);
                                        pendingBgTaskIds.Remove(tid);
                                        resolvedIds.Add(tid);
                                    }
                                }
                                // Auto-cancel schedule timers whose TimerCondition matched the arriving message
                                if (bgTimerConditions.Count > 0)
                                {
                                    List<string> expiredTimers = new List<string>();
                                    foreach (KeyValuePair<string, string> kv in bgTimerConditions)
                                    {
                                        if (string.Equals(kv.Value, "any", StringComparison.OrdinalIgnoreCase))
                                        {
                                            expiredTimers.Add(kv.Key);
                                            continue;
                                        }
                                        for (int ri = 0; ri < resolvedIds.Count; ri++)
                                        {
                                            if (string.Equals(kv.Value, resolvedIds[ri], StringComparison.OrdinalIgnoreCase))
                                            {
                                                expiredTimers.Add(kv.Key);
                                                break;
                                            }
                                        }
                                    }
                                    for (int ei = 0; ei < expiredTimers.Count; ei++)
                                    {
                                        pendingBgTaskIds.Remove(expiredTimers[ei]);
                                        bgTimerConditions.Remove(expiredTimers[ei]);
                                    }
                                }
                            }
                            const string cancelMarker = "Task \"";
                            int cIdx = contentStr.IndexOf(cancelMarker, StringComparison.Ordinal);
                            if (cIdx >= 0 && contentStr.IndexOf("cancel", StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                string afterC = contentStr.Substring(cIdx + cancelMarker.Length);
                                int qEnd = afterC.IndexOf('"');
                                if (qEnd > 0)
                                {
                                    string cidCancel = afterC.Substring(0, qEnd);
                                    pendingBgTaskIds.Remove(cidCancel);
                                    bgTimerConditions.Remove(cidCancel);
                                }
                            }
                        }
                        if (!isBgLaunchStep && string.Equals(st, "RUNNING", StringComparison.OrdinalIgnoreCase) && !string.Equals(tp, "PLANNER_RESPONSE", StringComparison.Ordinal))
                        {
                            hasRunningToolStep = true;
                        }
                        turnSteps++;
                        lastType = tp;
                        lastStatus = st;
                        List<object> tc = obj.ContainsKey("tool_calls") ? obj["tool_calls"] as List<object> : null;
                        lastHasTools = tc != null && tc.Count > 0;
                        if (lastHasTools)
                        {
                            for (int ti = 0; ti < tc.Count; ti++)
                            {
                                Dictionary<string, object> tcObj = tc[ti] as Dictionary<string, object>;
                                if (tcObj == null) continue;
                                string tName = tcObj.ContainsKey("name") ? Convert.ToString(tcObj["name"]) : "";
                                Dictionary<string, object> argsDict = tcObj.ContainsKey("args") ? tcObj["args"] as Dictionary<string, object> : null;
                                if (string.Equals(tName, "update_steps", StringComparison.Ordinal) && argsDict != null && argsDict.ContainsKey("steps"))
                                {
                                    try
                                    {
                                        object rawStepsObj = argsDict["steps"];
                                        List<object> stepArr = rawStepsObj as List<object>;
                                        if (stepArr == null && rawStepsObj is string)
                                        {
                                            stepArr = MiniJson.Parse((string)rawStepsObj) as List<object>;
                                        }
                                        if (stepArr != null && stepArr.Count > 0)
                                        {
                                            List<Tuple<string, string>> nextPlan = new List<Tuple<string, string>>();
                                            for (int si = 0; si < stepArr.Count && nextPlan.Count < 12; si++)
                                            {
                                                Dictionary<string, object> sObj = stepArr[si] as Dictionary<string, object>;
                                                if (sObj == null || !sObj.ContainsKey("title")) continue;
                                                string sTitle = Convert.ToString(sObj["title"]).Trim();
                                                if (string.IsNullOrEmpty(sTitle)) continue;
                                                string sStatus = sObj.ContainsKey("status") ? Convert.ToString(sObj["status"]).Trim().ToLowerInvariant() : "pending";
                                                nextPlan.Add(Tuple.Create(sTitle, sStatus));
                                            }
                                            if (nextPlan.Count > 0) planSteps = nextPlan;
                                        }
                                    }
                                    catch { }
                                    continue;
                                }
                                if (string.Equals(tName, "update_focus", StringComparison.Ordinal) && argsDict != null && argsDict.ContainsKey("focus"))
                                {
                                    string f = Convert.ToString(argsDict["focus"]).Trim().Trim('"').Trim();
                                    if (!string.IsNullOrEmpty(f)) currentFocus = f;
                                    continue;
                                }
                                if (string.Equals(tName, "schedule", StringComparison.Ordinal))
                                {
                                    string cond = (argsDict != null && argsDict.ContainsKey("TimerCondition"))
                                        ? Convert.ToString(argsDict["TimerCondition"]).Trim().Trim('"')
                                        : "";
                                    pendingScheduleConds.Enqueue(cond);
                                }
                                string summary = "";
                                if (argsDict != null && argsDict.ContainsKey("toolSummary"))
                                {
                                    summary = Convert.ToString(argsDict["toolSummary"]).Trim().Trim('"');
                                }
                                lastToolLabel = !string.IsNullOrEmpty(summary) ? summary : FormatToolNameZh(tName);
                                detailLines.Add("✓ " + lastToolLabel);
                            }
                        }
                        else if (string.Equals(tp, "PLANNER_RESPONSE", StringComparison.Ordinal))
                        {
                            lastToolLabel = "思考与生成回复";
                            detailLines.Add("✓ 思考与生成回复");
                        }
                    }

                    string stageLabel = "";
                    List<string> planDetailLines = null;
                    if (planSteps.Count > 0)
                    {
                        int activeIdx = -1;
                        for (int pi = 0; pi < planSteps.Count; pi++)
                        {
                            if (string.Equals(planSteps[pi].Item2, "in_progress", StringComparison.Ordinal)) { activeIdx = pi; break; }
                        }
                        if (activeIdx < 0)
                        {
                            for (int pi = 0; pi < planSteps.Count; pi++)
                            {
                                if (string.Equals(planSteps[pi].Item2, "pending", StringComparison.Ordinal)) { activeIdx = pi; break; }
                            }
                        }
                        if (activeIdx < 0) activeIdx = planSteps.Count - 1;
                        string curStageTitle = planSteps[activeIdx].Item1;
                        stageLabel = string.Format("[{0}/{1}] {2}", activeIdx + 1, planSteps.Count, curStageTitle);
                        planDetailLines = new List<string>();
                        for (int pi = 0; pi < planSteps.Count && pi < 8; pi++)
                        {
                            string ps = planSteps[pi].Item2;
                            string icon = ps == "in_progress" ? "⟳ " : ps == "done" ? "✓ " : ps == "failed" ? "! " : ps == "skipped" ? "– " : "○ ";
                            planDetailLines.Add(icon + planSteps[pi].Item1);
                        }
                        if (!string.IsNullOrEmpty(currentFocus) && !string.Equals(currentFocus, curStageTitle, StringComparison.Ordinal) && curStageTitle.IndexOf(currentFocus, StringComparison.Ordinal) < 0)
                        {
                            string sf = currentFocus.Length > 28 ? currentFocus.Substring(0, 27) + "…" : currentFocus;
                            planDetailLines.Add("· 当前：" + sf);
                        }
                    }
                    else if (!string.IsNullOrEmpty(currentFocus))
                    {
                        stageLabel = currentFocus;
                    }

                    if (!string.IsNullOrEmpty(stageLabel))
                    {
                        sigSb.Append('S').Append(cid).Append(':').Append(stageLabel).Append(';');
                        lock (_syncLock)
                        {
                            _knownStages[cid] = new KnownStageInfo
                            {
                                StageLabel = stageLabel,
                                DetailLines = planDetailLines != null ? new List<string>(planDetailLines) : new List<string>(),
                                UpdatedUtc = mtimeUtc
                            };
                        }
                    }

                    bool hasPendingBgTasks = pendingBgTaskIds.Count > 0 || hasRunningToolStep;
                    bool isFinalDone = string.Equals(lastType, "PLANNER_RESPONSE", StringComparison.Ordinal)
                        && string.Equals(lastStatus, "DONE", StringComparison.Ordinal)
                        && !lastHasTools
                        && !hasPendingBgTasks;
                    bool isError = string.Equals(lastStatus, "ERROR", StringComparison.Ordinal);

                    double runTimeoutSec = hasPendingBgTasks ? 1800 : 180;
                    bool running = !isFinalDone && !isError && agyAlive && ageSec <= runTimeoutSec;
                    if (running)
                    {
                        lock (_syncLock) { _bgSeenRunningIds.Add(cid); }
                    }
                    else
                    {
                        bool seenBefore;
                        lock (_syncLock) { seenBefore = _bgSeenRunningIds.Contains(cid); }
                        if (!seenBefore && ageSec > 75) continue;
                        if (ageSec > 150) continue;
                    }

                    string knownTitle = "";
                    lock (_syncLock)
                    {
                        _knownTaskTitles.TryGetValue(cid, out knownTitle);
                    }
                    string title = !string.IsNullOrEmpty(knownTitle)
                        ? knownTitle
                        : (!string.IsNullOrEmpty(userPromptTitle) ? userPromptTitle : ("会话 " + cid.Substring(0, 6)));
                    string shortTitle = title.Length > 14 ? title.Substring(0, 13) + "…" : title;

                    int elapsedSec = running
                        ? Math.Max(1, (int)Math.Round((nowUtc - turnStartUtc).TotalSeconds))
                        : Math.Max(1, (int)Math.Round((lastStepUtc - turnStartUtc).TotalSeconds));

                    NekoTaskItem item = new NekoTaskItem();
                    item.Id = cid;
                    item.ShortTitle = shortTitle;
                    item.TaskTitle = title;
                    item.Steps = Math.Max(1, turnSteps);
                    item.ElapsedSec = elapsedSec;
                    item.Running = running;
                    item.HasStage = !string.IsNullOrEmpty(stageLabel);
                    item.StageLabel = stageLabel;

                    if (running)
                    {
                        bool isThinkingNow = !hasPendingBgTasks && (string.Equals(lastType, "USER_INPUT", StringComparison.Ordinal) || string.Equals(lastType, "GENERIC", StringComparison.Ordinal));
                        item.WorkState = isThinkingNow ? "thinking" : "working";
                        if (!string.IsNullOrEmpty(stageLabel))
                        {
                            item.StatusText = string.Format("{0} {1} ({2}s)", isThinkingNow ? "✦" : "⚡", stageLabel, elapsedSec);
                        }
                        else
                        {
                            string runLabel = hasPendingBgTasks && (string.IsNullOrEmpty(lastToolLabel) || lastToolLabel == "思考与生成回复")
                                ? "后台挂起运行中"
                                : (!string.IsNullOrEmpty(lastToolLabel) ? lastToolLabel : "后台执行中");
                            item.StatusText = isThinkingNow
                                ? string.Format("✦ 思考中 · {0}步 ({1}s)", item.Steps, elapsedSec)
                                : string.Format("⚡ {0} · {1}步 ({2}s)", runLabel, item.Steps, elapsedSec);
                        }
                    }
                    else if (isError)
                    {
                        item.WorkState = "error";
                        item.DoneState = "error";
                        item.StatusText = "! 任务遇到异常";
                    }
                    else
                    {
                        item.WorkState = "done";
                        item.DoneState = "done";
                        item.StatusText = string.Format("✓ 任务已完成 · 本轮{0}步 ({1}s)", item.Steps, elapsedSec);
                    }

                    if (planDetailLines != null && planDetailLines.Count > 0)
                    {
                        item.DetailLines = planDetailLines;
                    }
                    else
                    {
                        if (detailLines.Count > 5)
                        {
                            detailLines = detailLines.GetRange(detailLines.Count - 5, 5);
                        }
                        if (running && detailLines.Count > 0)
                        {
                            detailLines[detailLines.Count - 1] = "⟳ " + detailLines[detailLines.Count - 1].Substring(2);
                        }
                        item.DetailLines = detailLines;
                    }
                    parsedItemsByCid[cid] = item;
                }

                // Phase 3: Fold all Swarm workers & Subagents into their parent conversation
                Dictionary<string, ParentAgentMeta> parentMetaMap = new Dictionary<string, ParentAgentMeta>(StringComparer.Ordinal);
                Dictionary<string, List<NekoTaskItem>> childrenByParent = new Dictionary<string, List<NekoTaskItem>>(StringComparer.Ordinal);

                foreach (KeyValuePair<string, NekoTaskItem> kv in parsedItemsByCid)
                {
                    string cid = kv.Key;
                    NekoTaskItem it = kv.Value;
                    string parentCid;
                    if (childToParent.TryGetValue(cid, out parentCid) && !string.IsNullOrEmpty(parentCid))
                    {
                        List<NekoTaskItem> clist;
                        if (!childrenByParent.TryGetValue(parentCid, out clist))
                        {
                            clist = new List<NekoTaskItem>();
                            childrenByParent[parentCid] = clist;
                        }
                        clist.Add(it);
                    }
                }

                foreach (KeyValuePair<string, List<NekoTaskItem>> ckv in childrenByParent)
                {
                    string pCid = ckv.Key;
                    List<NekoTaskItem> clist = ckv.Value;
                    clist.Sort((a, b) =>
                    {
                        if (a.Running != b.Running) return a.Running ? -1 : 1;
                        return string.Compare(a.Id, b.Id, StringComparison.Ordinal);
                    });

                    bool isSwarm = swarmParents.Contains(pCid);
                    ParentAgentMeta meta = new ParentAgentMeta();
                    meta.AgentMode = isSwarm ? "swarm" : "multi";
                    string sTitle;
                    if (swarmTitles.TryGetValue(pCid, out sTitle)) meta.SwarmTitle = sTitle;
                    int memberTotal;
                    meta.TotalCount = swarmMemberTotal.TryGetValue(pCid, out memberTotal) ? Math.Max(memberTotal, clist.Count) : clist.Count;
                    int runCnt = 0;
                    for (int ci = 0; ci < clist.Count; ci++)
                    {
                        NekoTaskItem child = clist[ci];
                        if (child.Running) runCnt++;
                        if (meta.ChildLines.Count < 8)
                        {
                            string rLabel;
                            if (!childRoleLabels.TryGetValue(child.Id, out rLabel) || string.IsNullOrEmpty(rLabel))
                            {
                                rLabel = !string.IsNullOrEmpty(child.ShortTitle) ? child.ShortTitle : ("代理 " + child.Id.Substring(0, 6));
                            }
                            if (rLabel.Length > 18) rLabel = rLabel.Substring(0, 17) + "…";
                            string cIcon = isSwarm ? "🐝 " : "🤖 ";
                            string cSt = child.StatusText ?? "";
                            if (cSt.Length > 34) cSt = cSt.Substring(0, 33) + "…";
                            meta.ChildLines.Add(string.Format("{0}{1} · {2}", cIcon, rLabel, cSt));
                        }
                    }
                    meta.RunningCount = runCnt;
                    parentMetaMap[pCid] = meta;

                    // If parent coordinator is currently quiet while workers/nested subagents are active (or just finished), keep root card alive
                    if (!parsedItemsByCid.ContainsKey(pCid) && clist.Count > 0 && (runCnt > 0 || clist[0].DoneState == "done" || clist[0].DoneState == "error"))
                    {
                        string pKnownTitle = "";
                        lock (_syncLock) { _knownTaskTitles.TryGetValue(pCid, out pKnownTitle); }
                        string pTitle = !string.IsNullOrEmpty(pKnownTitle)
                            ? pKnownTitle
                            : (!string.IsNullOrEmpty(meta.SwarmTitle) ? meta.SwarmTitle : ("会话 " + pCid.Substring(0, 6)));
                        NekoTaskItem synth = new NekoTaskItem();
                        synth.Id = pCid;
                        synth.TaskTitle = pTitle;
                        synth.ShortTitle = pTitle.Length > 14 ? pTitle.Substring(0, 13) + "…" : pTitle;
                        synth.Steps = clist[0].Steps;
                        synth.ElapsedSec = clist[0].ElapsedSec;
                        if (runCnt > 0)
                        {
                            synth.Running = true;
                            synth.WorkState = "working";
                            synth.StatusText = isSwarm
                                ? string.Format("🐝 蜂群并行协作 ({0}/{1}运行)", runCnt, meta.TotalCount)
                                : string.Format("🤖 多代理协作 ({0}运行)", runCnt);
                        }
                        else if (clist[0].DoneState == "error")
                        {
                            synth.Running = false;
                            synth.WorkState = "error";
                            synth.DoneState = "error";
                            synth.StatusText = "! 子代理遇到异常";
                        }
                        else
                        {
                            synth.Running = false;
                            synth.WorkState = "done";
                            synth.DoneState = "done";
                            synth.StatusText = string.Format("✓ 子代理任务已完成 ({0}s)", synth.ElapsedSec);
                        }
                        parsedItemsByCid[pCid] = synth;
                    }
                }

                // Also preserve agentMode for known swarm parents whose workers finished recently
                foreach (string spCid in swarmParents)
                {
                    if (!parentMetaMap.ContainsKey(spCid) && parsedItemsByCid.ContainsKey(spCid))
                    {
                        ParentAgentMeta meta = new ParentAgentMeta();
                        meta.AgentMode = "swarm";
                        string sTitle;
                        if (swarmTitles.TryGetValue(spCid, out sTitle)) meta.SwarmTitle = sTitle;
                        int memberTotal;
                        if (swarmMemberTotal.TryGetValue(spCid, out memberTotal)) meta.TotalCount = memberTotal;
                        parentMetaMap[spCid] = meta;
                    }
                }

                List<NekoTaskItem> bgItems = new List<NekoTaskItem>();
                foreach (KeyValuePair<string, NekoTaskItem> kv in parsedItemsByCid)
                {
                    string cid = kv.Key;
                    if (childToParent.ContainsKey(cid)) continue; // Folded into parent
                    NekoTaskItem item = kv.Value;
                    ParentAgentMeta pMeta;
                    if (parentMetaMap.TryGetValue(cid, out pMeta) && pMeta != null)
                    {
                        item.AgentMode = pMeta.AgentMode;
                        item.SubagentRunning = pMeta.RunningCount;
                        item.SubagentTotal = pMeta.TotalCount;
                        item.ChildLines = new List<string>(pMeta.ChildLines);
                        if (pMeta.RunningCount > 0 && !item.Running)
                        {
                            item.Running = true;
                            item.WorkState = "working";
                            item.DoneState = "";
                            item.StatusText = string.Equals(pMeta.AgentMode, "swarm", StringComparison.Ordinal)
                                ? string.Format("🐝 蜂群并行协作 ({0}/{1}运行)", pMeta.RunningCount, Math.Max(pMeta.RunningCount, pMeta.TotalCount))
                                : string.Format("🤖 多代理协作 ({0}运行)", pMeta.RunningCount);
                        }
                    }
                    else if (multiParents.Contains(cid))
                    {
                        item.AgentMode = "multi";
                    }
                    bgItems.Add(item);
                    sigSb.Append(item.Id).Append('|').Append(item.Running ? '1' : '0').Append('|').Append(item.AgentMode)
                        .Append('|').Append(item.SubagentRunning).Append('/').Append(item.SubagentTotal)
                        .Append('|').Append(item.Steps).Append('|').Append(item.StatusText)
                        .Append('|').Append(item.ChildLines.Count > 0 ? item.ChildLines[0] : "").Append(';');
                }

                string sig = sigSb.ToString();
                lock (_syncLock)
                {
                    _childToParent = childToParent;
                    _parentAgentMeta = parentMetaMap;
                }
                if (string.Equals(sig, _lastBgSig, StringComparison.Ordinal)) return;
                _lastBgSig = sig;

                lock (_syncLock)
                {
                    _sourceTasks["__bg_transcript__"] = bgItems;
                }
                DispatchMergedTelemetry();
            }
            catch { }
            finally
            {
                Interlocked.Exchange(ref _bgPolling, 0);
            }
        }

        private static NekoTaskItem ParseTaskDict(Dictionary<string, object> raw, string fallbackId, string windowTitle)
        {
            if (raw == null) return null;
            string statusText = raw.ContainsKey("statusText") ? Convert.ToString(raw["statusText"]) : "";
            if (string.IsNullOrEmpty(statusText)) return null;
            NekoTaskItem item = new NekoTaskItem();
            item.Id = raw.ContainsKey("id") && !string.IsNullOrEmpty(Convert.ToString(raw["id"])) ? Convert.ToString(raw["id"]) : fallbackId;
            item.ShortTitle = raw.ContainsKey("shortTitle") ? Convert.ToString(raw["shortTitle"]) : "";
            item.TaskTitle = raw.ContainsKey("taskTitle") ? Convert.ToString(raw["taskTitle"]) : "";
            item.WindowTitle = !string.IsNullOrEmpty(windowTitle) ? windowTitle : (raw.ContainsKey("windowTitle") ? Convert.ToString(raw["windowTitle"]) : "");
            item.WorkState = raw.ContainsKey("workState") ? Convert.ToString(raw["workState"]) : "idle";
            item.Running = raw.ContainsKey("running") && Equals(raw["running"], true);
            item.DoneState = raw.ContainsKey("doneState") ? Convert.ToString(raw["doneState"]) : "";
            item.StatusText = statusText;
            if (raw.ContainsKey("steps")) item.Steps = Convert.ToInt32(raw["steps"]);
            if (raw.ContainsKey("elapsedSec")) item.ElapsedSec = Convert.ToInt32(raw["elapsedSec"]);
            if (raw.ContainsKey("agentMode"))
            {
                string am = Convert.ToString(raw["agentMode"]).Trim();
                if (am == "swarm" || am == "multi" || am == "single") item.AgentMode = am;
            }
            if (raw.ContainsKey("subagentRunning"))
            {
                try { item.SubagentRunning = Math.Max(0, Convert.ToInt32(raw["subagentRunning"])); } catch { }
            }
            if (raw.ContainsKey("subagentTotal"))
            {
                try { item.SubagentTotal = Math.Max(0, Convert.ToInt32(raw["subagentTotal"])); } catch { }
            }
            if (item.AgentMode == "single" && (item.SubagentRunning > 0 || item.SubagentTotal > 0))
            {
                item.AgentMode = "multi";
            }
            List<object> lines = raw.ContainsKey("detailLines") ? raw["detailLines"] as List<object> : null;
            if (lines != null)
            {
                for (int i = 0; i < lines.Count; i++)
                {
                    string s = lines[i] as string;
                    if (!string.IsNullOrEmpty(s)) item.DetailLines.Add(s);
                }
            }
            return item;
        }

        public void UpdateTelemetry(Dictionary<string, object> syncObj, string sourceId = "default", string windowTitle = "")
        {
            if (_disposed || _form == null || _form.IsDisposed || syncObj == null) return;
            string srcKey = string.IsNullOrEmpty(sourceId) ? "default" : sourceId;

            lock (_syncLock)
            {
                if (syncObj.ContainsKey("enabled"))
                {
                    _globalEnabled = !Equals(syncObj["enabled"], false);
                }
                if (syncObj.ContainsKey("quotaUsedPct") && syncObj["quotaUsedPct"] != null)
                {
                    try
                    {
                        int qPct = Convert.ToInt32(syncObj["quotaUsedPct"]);
                        if (qPct >= 0 && qPct <= 100) _lastQuotaUsedPct = qPct;
                    }
                    catch { }
                }
                if (syncObj.ContainsKey("quotaSummary") && syncObj["quotaSummary"] != null)
                {
                    string qSum = Convert.ToString(syncObj["quotaSummary"]).Trim();
                    if (!string.IsNullOrEmpty(qSum)) _lastQuotaSummary = qSum;
                }

                // Only update task list when this payload carries task fields (setting toggle payload only has "enabled")
                bool hasTaskPayload = syncObj.ContainsKey("tasks") || syncObj.ContainsKey("statusText") || syncObj.ContainsKey("running");
                if (hasTaskPayload)
                {
                    List<NekoTaskItem> items = new List<NekoTaskItem>();
                    List<object> rawTasks = syncObj.ContainsKey("tasks") ? syncObj["tasks"] as List<object> : null;
                    if (rawTasks != null)
                    {
                        for (int i = 0; i < rawTasks.Count; i++)
                        {
                            NekoTaskItem ti = ParseTaskDict(rawTasks[i] as Dictionary<string, object>, srcKey + "#" + i, windowTitle);
                            if (ti != null) items.Add(ti);
                        }
                    }
                    else
                    {
                        NekoTaskItem single = ParseTaskDict(syncObj, srcKey, windowTitle);
                        if (single != null) items.Add(single);
                    }

                    // Remember real conversation titles & un-dismiss when a new turn starts running
                    for (int i = 0; i < items.Count; i++)
                    {
                        NekoTaskItem ti = items[i];
                        if (string.IsNullOrEmpty(ti.Id)) continue;
                        if (!string.IsNullOrEmpty(ti.TaskTitle) && ti.TaskTitle != "当前对话任务" && ti.TaskTitle != "Active Task")
                        {
                            _knownTaskTitles[ti.Id] = ti.TaskTitle;
                        }
                        ShouldSkipDismissedTask(ti);
                    }
                    _sourceTasks[srcKey] = items;
                }
            }

            DispatchMergedTelemetry();
        }

        private static NekoTaskItem EnrichWithStage(NekoTaskItem existing, string stageLabel, List<string> stageDetails, int fallbackElapsedSec)
        {
            NekoTaskItem enriched = new NekoTaskItem();
            enriched.Id = existing.Id;
            enriched.ShortTitle = existing.ShortTitle;
            enriched.TaskTitle = existing.TaskTitle;
            enriched.WindowTitle = existing.WindowTitle;
            enriched.WorkState = existing.WorkState;
            enriched.Running = existing.Running;
            enriched.DoneState = existing.DoneState;
            enriched.Steps = existing.Steps;
            enriched.ElapsedSec = existing.ElapsedSec > 0 ? existing.ElapsedSec : fallbackElapsedSec;
            enriched.HasStage = true;
            enriched.StageLabel = stageLabel;
            enriched.AgentMode = existing.AgentMode;
            enriched.SubagentRunning = existing.SubagentRunning;
            enriched.SubagentTotal = existing.SubagentTotal;
            enriched.ChildLines = existing.ChildLines != null ? new List<string>(existing.ChildLines) : new List<string>();
            string icon = string.Equals(enriched.WorkState, "thinking", StringComparison.Ordinal) ? "✦" : "⚡";
            enriched.StatusText = enriched.ElapsedSec > 0
                ? string.Format("{0} {1} ({2}s)", icon, stageLabel, enriched.ElapsedSec)
                : string.Format("{0} {1}", icon, stageLabel);
            enriched.DetailLines = (stageDetails != null && stageDetails.Count > 0) ? stageDetails : existing.DetailLines;
            return enriched;
        }

        private static string MergeAgentMode(string a, string b)
        {
            if (string.Equals(a, "swarm", StringComparison.Ordinal) || string.Equals(b, "swarm", StringComparison.Ordinal)) return "swarm";
            if (string.Equals(a, "multi", StringComparison.Ordinal) || string.Equals(b, "multi", StringComparison.Ordinal)) return "multi";
            return "single";
        }

        private void DispatchMergedTelemetry()
        {
            if (_disposed || _form == null || _form.IsDisposed) return;

            NekoTelemetryState merged = new NekoTelemetryState();
            lock (_syncLock)
            {
                merged.Enabled = _globalEnabled;
                Dictionary<string, NekoTaskItem> byId = new Dictionary<string, NekoTaskItem>(StringComparer.Ordinal);
                // First pass: live CDP window sources (higher priority & richer metadata; filter out any known child subagents/workers)
                foreach (KeyValuePair<string, List<NekoTaskItem>> kv in _sourceTasks)
                {
                    if (string.Equals(kv.Key, "__bg_transcript__", StringComparison.Ordinal)) continue;
                    List<NekoTaskItem> list = kv.Value;
                    for (int i = 0; i < list.Count; i++)
                    {
                        NekoTaskItem item = list[i];
                        if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                        if (_childToParent.ContainsKey(item.Id)) continue;
                        if (ShouldSkipDismissedTask(item)) continue;
                        NekoTaskItem existing;
                        if (!byId.TryGetValue(item.Id, out existing))
                        {
                            byId[item.Id] = item;
                        }
                        else if ((item.Running && !existing.Running) ||
                            (item.Running == existing.Running && item.DetailLines.Count >= existing.DetailLines.Count))
                        {
                            byId[item.Id] = item;
                        }
                    }
                }
                // Second pass: background transcript tracker (fills in tasks when windows are closed/minimized or not in active view)
                List<NekoTaskItem> bgList;
                if (_sourceTasks.TryGetValue("__bg_transcript__", out bgList) && bgList != null)
                {
                    for (int i = 0; i < bgList.Count; i++)
                    {
                        NekoTaskItem item = bgList[i];
                        if (item == null || string.IsNullOrEmpty(item.Id)) continue;
                        if (_childToParent.ContainsKey(item.Id)) continue;
                        if (ShouldSkipDismissedTask(item)) continue;
                        NekoTaskItem existing;
                        if (!byId.TryGetValue(item.Id, out existing))
                        {
                            byId[item.Id] = item;
                        }
                        else if (existing.Running && item.HasStage && !string.IsNullOrEmpty(item.StageLabel))
                        {
                            NekoTaskItem enriched = EnrichWithStage(existing, item.StageLabel, item.DetailLines, item.ElapsedSec);
                            enriched.AgentMode = MergeAgentMode(existing.AgentMode, item.AgentMode);
                            enriched.SubagentRunning = Math.Max(existing.SubagentRunning, item.SubagentRunning);
                            enriched.SubagentTotal = Math.Max(existing.SubagentTotal, item.SubagentTotal);
                            if (item.ChildLines != null && item.ChildLines.Count > 0) enriched.ChildLines = new List<string>(item.ChildLines);
                            byId[item.Id] = enriched;
                        }
                        else
                        {
                            existing.AgentMode = MergeAgentMode(existing.AgentMode, item.AgentMode);
                            existing.SubagentRunning = Math.Max(existing.SubagentRunning, item.SubagentRunning);
                            existing.SubagentTotal = Math.Max(existing.SubagentTotal, item.SubagentTotal);
                            if (item.ChildLines != null && item.ChildLines.Count > 0) existing.ChildLines = new List<string>(item.ChildLines);
                            if (item.Running && !existing.Running && item.SubagentRunning > 0)
                            {
                                existing.Running = true;
                                existing.WorkState = "working";
                                existing.DoneState = "";
                            }
                        }
                    }
                }

                // Third pass: enrich live cards with _knownStages & folded Swarm/Subagent metadata
                List<string> liveKeys = new List<string>(byId.Keys);
                DateTime nowStageUtc = DateTime.UtcNow;
                for (int i = 0; i < liveKeys.Count; i++)
                {
                    NekoTaskItem cur = byId[liveKeys[i]];
                    if (cur == null) continue;
                    if (cur.Running && !cur.HasStage)
                    {
                        KnownStageInfo ks;
                        if (_knownStages.TryGetValue(cur.Id, out ks) && ks != null && !string.IsNullOrEmpty(ks.StageLabel) && (nowStageUtc - ks.UpdatedUtc).TotalSeconds <= 1800)
                        {
                            cur = EnrichWithStage(cur, ks.StageLabel, ks.DetailLines, cur.ElapsedSec);
                            byId[liveKeys[i]] = cur;
                        }
                    }
                    ParentAgentMeta pMeta;
                    if (_parentAgentMeta.TryGetValue(cur.Id, out pMeta) && pMeta != null)
                    {
                        cur.AgentMode = MergeAgentMode(cur.AgentMode, pMeta.AgentMode);
                        cur.SubagentRunning = Math.Max(cur.SubagentRunning, pMeta.RunningCount);
                        cur.SubagentTotal = Math.Max(cur.SubagentTotal, pMeta.TotalCount);
                        if (pMeta.ChildLines != null && pMeta.ChildLines.Count > 0)
                        {
                            cur.ChildLines = new List<string>(pMeta.ChildLines);
                        }
                        if (pMeta.RunningCount > 0 && !cur.Running)
                        {
                            cur.Running = true;
                            cur.WorkState = "working";
                            cur.DoneState = "";
                        }
                    }
                }

                List<NekoTaskItem> all = new List<NekoTaskItem>(byId.Values);
                // Sort: running tasks first, then error, then done
                all.Sort((a, b) =>
                {
                    int pa = a.Running ? 0 : (a.DoneState == "error" ? 1 : 2);
                    int pb = b.Running ? 0 : (b.DoneState == "error" ? 1 : 2);
                    if (pa != pb) return pa.CompareTo(pb);
                    return string.Compare(a.Id, b.Id, StringComparison.Ordinal);
                });

                merged.Tasks = all;
                merged.QuotaUsedPct = _lastQuotaUsedPct;
                merged.QuotaSummary = _lastQuotaSummary;
                bool anyWorking = false;
                bool anyThinking = false;
                bool anyWaiting = false;
                bool anyError = false;
                bool anyDone = false;
                for (int i = 0; i < all.Count; i++)
                {
                    NekoTaskItem it = all[i];
                    if (it.Running)
                    {
                        merged.Running = true;
                        if (it.WorkState == "waiting") anyWaiting = true;
                        else if (it.WorkState == "thinking") anyThinking = true;
                        else anyWorking = true;
                    }
                    else if (it.DoneState == "error") anyError = true;
                    else if (it.DoneState == "done") anyDone = true;
                }
                if (merged.Running)
                {
                    merged.WorkState = anyWaiting ? "waiting" : anyWorking ? "working" : anyThinking ? "thinking" : "working";
                }
                else if (anyError)
                {
                    merged.WorkState = "error";
                    merged.DoneState = "error";
                }
                else if (anyDone)
                {
                    merged.WorkState = "done";
                    merged.DoneState = "done";
                }
                else
                {
                    merged.WorkState = "idle";
                }
            }

            try
            {
                if (_form.IsHandleCreated)
                {
                    _form.BeginInvoke((Action)(() => _form.ApplyTelemetry(merged)));
                }
            }
            catch { }
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            try { if (_bgTranscriptTimer != null) _bgTranscriptTimer.Dispose(); } catch { }
            try
            {
                if (_form != null && !_form.IsDisposed && _form.IsHandleCreated)
                {
                    _form.BeginInvoke((Action)(() =>
                    {
                        try { _form.Close(); } catch { }
                        try { Application.ExitThread(); } catch { }
                    }));
                }
            }
            catch { }
            try { _server.Dispose(); } catch { }
        }
    }
}
