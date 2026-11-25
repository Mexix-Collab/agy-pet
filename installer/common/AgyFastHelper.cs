using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

namespace AgyClaudeStyle
{
    public static class AgyFastHelper
    {
        public const string PluginName = "agy-fast";
        private const string ManagedMarkerFile = ".agy-pet-managed";
        private const string LegacyManagedMarkerFile = ".agy-claude-style-managed";

        public static string GetGeminiConfigRoot()
        {
            string testRoot = Environment.GetEnvironmentVariable("AGY_CS_TEST_SYSTEM_ROOT");
            if (!string.IsNullOrEmpty(testRoot) && testRoot.Trim().Length > 0)
            {
                return Path.Combine(Path.GetFullPath(testRoot.Trim()), ".gemini", "config");
            }
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            return Path.Combine(home, ".gemini", "config");
        }

        public static string GetPluginDir()
        {
            return Path.Combine(GetGeminiConfigRoot(), "plugins", PluginName);
        }

        public static string GetConfigJsonPath()
        {
            return Path.Combine(GetGeminiConfigRoot(), "config.json");
        }

        public static bool CheckNodeVersion(out int major, out string rawVersion)
        {
            major = 0;
            rawVersion = "";
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("node", "-v");
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi))
                {
                    if (p == null) return false;
                    string output = p.StandardOutput.ReadToEnd().Trim();
                    if (!p.WaitForExit(4000))
                    {
                        try { p.Kill(); } catch { }
                        return false;
                    }
                    if (p.ExitCode != 0 || string.IsNullOrEmpty(output)) return false;
                    rawVersion = output;
                    string clean = output.StartsWith("v", StringComparison.OrdinalIgnoreCase) ? output.Substring(1) : output;
                    string[] parts = clean.Split('.');
                    if (parts.Length > 0 && int.TryParse(parts[0], out major))
                    {
                        return major >= 20;
                    }
                }
            }
            catch { }
            return false;
        }

        public static bool IsInstalled()
        {
            try
            {
                string dir = GetPluginDir();
                return File.Exists(Path.Combine(dir, "plugin.json"))
                    && File.Exists(Path.Combine(dir, "dist", "mcp-server.mjs"));
            }
            catch
            {
                return false;
            }
        }

        public static bool IsEnabled()
        {
            if (!IsInstalled()) return false;
            try
            {
                string cfgPath = GetConfigJsonPath();
                if (!File.Exists(cfgPath)) return true;
                Dictionary<string, object> root = MiniJson.ParseObject(File.ReadAllText(cfgPath, Encoding.UTF8));
                if (root.ContainsKey("plugins"))
                {
                    Dictionary<string, object> plugins = root["plugins"] as Dictionary<string, object>;
                    if (plugins != null && plugins.ContainsKey(PluginName))
                    {
                        Dictionary<string, object> entry = plugins[PluginName] as Dictionary<string, object>;
                        if (entry != null && entry.ContainsKey("enabled"))
                        {
                            return !Equals(entry["enabled"], false);
                        }
                    }
                }
                return true;
            }
            catch
            {
                return true;
            }
        }

        public static bool InstallAndEnable(string sourcePluginDir, out string message)
        {
            int nodeMajor;
            string nodeVer;
            if (!CheckNodeVersion(out nodeMajor, out nodeVer))
            {
                message = string.IsNullOrEmpty(nodeVer)
                    ? "未检测到 Node.js（需要 >= 20），已跳过 agy-fast 加速插件"
                    : string.Format("Node.js 版本过低 ({0}，需要 >= 20)，已跳过 agy-fast 加速插件", nodeVer);
                return false;
            }

            if (string.IsNullOrEmpty(sourcePluginDir) || !Directory.Exists(sourcePluginDir) || !File.Exists(Path.Combine(sourcePluginDir, "plugin.json")))
            {
                message = "安装包内未找到 agy-fast 插件源码目录";
                return false;
            }

            string targetDir = GetPluginDir();
            try
            {
                bool hadExistingUnmanaged = Directory.Exists(targetDir)
                    && File.Exists(Path.Combine(targetDir, "plugin.json"))
                    && !File.Exists(Path.Combine(targetDir, ManagedMarkerFile))
                    && !File.Exists(Path.Combine(targetDir, LegacyManagedMarkerFile));

                CopyDirectoryPreservingLocalRules(sourcePluginDir, targetDir);

                if (!hadExistingUnmanaged)
                {
                    File.WriteAllText(
                        Path.Combine(targetDir, ManagedMarkerFile),
                        "managed-by=agy-pet\n",
                        new UTF8Encoding(false)
                    );
                    try { File.Delete(Path.Combine(targetDir, LegacyManagedMarkerFile)); } catch { }
                }

                WriteConfigEnabled(true);
                TryRunAgyPluginCommand("enable");
                message = string.Format("已安装并启用 agy-fast 加速插件 (Node {0}，新会话自动生效)", nodeVer);
                return true;
            }
            catch (Exception ex)
            {
                message = "安装 agy-fast 失败: " + ex.Message;
                return false;
            }
        }

        public static bool SetEnabled(bool enabled, string fallbackSourceDir, out string message)
        {
            if (enabled)
            {
                if (!IsInstalled())
                {
                    if (!string.IsNullOrEmpty(fallbackSourceDir) && Directory.Exists(fallbackSourceDir))
                    {
                        return InstallAndEnable(fallbackSourceDir, out message);
                    }
                    message = "未找到 agy-fast 插件文件，请重新运行安装程序启用";
                    return false;
                }
                int major;
                string ver;
                if (!CheckNodeVersion(out major, out ver))
                {
                    message = string.IsNullOrEmpty(ver)
                        ? "需要 Node.js >= 20 才能启用 agy-fast 加速插件"
                        : string.Format("当前 Node.js {0} 低于 20，无法启用 agy-fast", ver);
                    return false;
                }
                try
                {
                    WriteConfigEnabled(true);
                    TryRunAgyPluginCommand("enable");
                    message = "已开启 agy-fast 加速插件（新开会话生效）";
                    return true;
                }
                catch (Exception ex)
                {
                    message = "开启 agy-fast 失败: " + ex.Message;
                    return false;
                }
            }
            else
            {
                try
                {
                    WriteConfigEnabled(false);
                    TryRunAgyPluginCommand("disable");
                    message = "已关闭 agy-fast 加速插件（新开会话生效）";
                    return true;
                }
                catch (Exception ex)
                {
                    message = "关闭 agy-fast 失败: " + ex.Message;
                    return false;
                }
            }
        }

        public static bool UninstallIfManaged(out string message)
        {
            string targetDir = GetPluginDir();
            if (!Directory.Exists(targetDir))
            {
                message = "";
                return false;
            }
            if (!File.Exists(Path.Combine(targetDir, ManagedMarkerFile)) &&
                !File.Exists(Path.Combine(targetDir, LegacyManagedMarkerFile)))
            {
                message = "检测到独立安装的 agy-fast 插件，已予以保留";
                return false;
            }
            try
            {
                TryRunAgyPluginCommand("disable");
                RemoveFromConfigJson();
                Directory.Delete(targetDir, true);
                message = "已移除随安装包部署的 agy-fast 加速插件";
                return true;
            }
            catch (Exception ex)
            {
                message = "移除 agy-fast 失败: " + ex.Message;
                return false;
            }
        }

        private static void CopyDirectoryPreservingLocalRules(string srcDir, string dstDir)
        {
            Directory.CreateDirectory(dstDir);
            string[] files = Directory.GetFiles(srcDir, "*", SearchOption.AllDirectories);
            string normSrc = Path.GetFullPath(srcDir).TrimEnd('\\', '/');
            for (int i = 0; i < files.Length; i++)
            {
                string srcFile = files[i];
                string rel = Path.GetFullPath(srcFile).Substring(normSrc.Length).TrimStart('\\', '/');
                if (string.Equals(rel.Replace('/', '\\'), @"rules\AGENTS.local.md", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                string dstFile = Path.Combine(dstDir, rel);
                string parent = Path.GetDirectoryName(dstFile);
                if (!string.IsNullOrEmpty(parent)) Directory.CreateDirectory(parent);
                File.Copy(srcFile, dstFile, true);
            }
        }

        private static void WriteConfigEnabled(bool enabled)
        {
            string cfgPath = GetConfigJsonPath();
            string cfgDir = Path.GetDirectoryName(cfgPath);
            if (!string.IsNullOrEmpty(cfgDir)) Directory.CreateDirectory(cfgDir);

            Dictionary<string, object> root = null;
            if (File.Exists(cfgPath))
            {
                try
                {
                    root = MiniJson.ParseObject(File.ReadAllText(cfgPath, Encoding.UTF8));
                }
                catch { }
            }
            if (root == null) root = new Dictionary<string, object>(StringComparer.Ordinal);

            Dictionary<string, object> plugins = root.ContainsKey("plugins") ? root["plugins"] as Dictionary<string, object> : null;
            if (plugins == null)
            {
                plugins = new Dictionary<string, object>(StringComparer.Ordinal);
                root["plugins"] = plugins;
            }

            Dictionary<string, object> entry = plugins.ContainsKey(PluginName) ? plugins[PluginName] as Dictionary<string, object> : null;
            if (entry == null)
            {
                entry = new Dictionary<string, object>(StringComparer.Ordinal);
                plugins[PluginName] = entry;
            }
            entry["enabled"] = enabled;

            string tmp = cfgPath + ".tmp." + Process.GetCurrentProcess().Id;
            File.WriteAllText(tmp, MiniJson.Stringify(root, true) + "\n", new UTF8Encoding(false));
            try
            {
                if (File.Exists(cfgPath)) File.Delete(cfgPath);
                File.Move(tmp, cfgPath);
            }
            catch
            {
                File.Copy(tmp, cfgPath, true);
                try { File.Delete(tmp); } catch { }
            }
        }

        private static void RemoveFromConfigJson()
        {
            string cfgPath = GetConfigJsonPath();
            if (!File.Exists(cfgPath)) return;
            try
            {
                Dictionary<string, object> root = MiniJson.ParseObject(File.ReadAllText(cfgPath, Encoding.UTF8));
                Dictionary<string, object> plugins = root.ContainsKey("plugins") ? root["plugins"] as Dictionary<string, object> : null;
                if (plugins != null && plugins.Remove(PluginName))
                {
                    string tmp = cfgPath + ".tmp." + Process.GetCurrentProcess().Id;
                    File.WriteAllText(tmp, MiniJson.Stringify(root, true) + "\n", new UTF8Encoding(false));
                    try
                    {
                        File.Delete(cfgPath);
                        File.Move(tmp, cfgPath);
                    }
                    catch
                    {
                        File.Copy(tmp, cfgPath, true);
                        try { File.Delete(tmp); } catch { }
                    }
                }
            }
            catch { }
        }

        private static void TryRunAgyPluginCommand(string action)
        {
            // Skip CLI invocation under isolated test root
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AGY_CS_TEST_SYSTEM_ROOT"))) return;
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("agy", "plugin " + action + " " + PluginName);
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                psi.RedirectStandardError = true;
                psi.CreateNoWindow = true;
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(3500);
                }
            }
            catch { }
        }
    }
}
