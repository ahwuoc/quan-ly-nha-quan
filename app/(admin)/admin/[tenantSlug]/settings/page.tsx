"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { tenantsApi, type TenantSettings as SettingsData } from "@/lib/api/tenants";
import { Shield, Save, Plus, X, Globe, Lock, AlertCircle, Info, Clock, RefreshCw, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";



export default function SettingsPage() {
  const params = useParams();
  const tenantSlug = params.tenantSlug as string;
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState("");

  const fetchSettings = useCallback(async function () {
    try {
      const result = await tenantsApi.getSettings(tenantSlug);
      const sanitized = {
        ...result.payload,
        allowed_ips: result.payload.allowed_ips || [],
        ip_restriction_enabled: !!result.payload.ip_restriction_enabled,
        order_cancel_window: result.payload.order_cancel_window ?? 120,
        ip_auto_sync: !!result.payload.ip_auto_sync,
        wifi_name: result.payload.wifi_name || "",
        wifi_password: result.payload.wifi_password || ""
      };
      setData(sanitized);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);



  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      await tenantsApi.updateSettings(tenantSlug, {
        allowed_ips: data.allowed_ips,
        ip_restriction_enabled: data.ip_restriction_enabled,
        order_cancel_window: data.order_cancel_window,
        ip_auto_sync: data.ip_auto_sync,
        wifi_name: data.wifi_name,
        wifi_password: data.wifi_password,
      });
      toast.success("Cấu hình đã được lưu thành công!");
    } catch (error) {
      toast.error("Lỗi khi lưu cấu hình!");
    } finally {
      setSaving(false);
    }
  }

  const addIp = (ip: string) => {
    if (!ip || !data) return;
    if (data.allowed_ips.includes(ip)) return;
    setData({ ...data, allowed_ips: [...data.allowed_ips, ip] });
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    if (!data) return;
    setData({ ...data, allowed_ips: data.allowed_ips.filter(i => i !== ip) });
  };

  if (loading || !data) {
    return <div className="p-8 animate-pulse space-y-6">
      <div className="h-10 bg-muted w-48 rounded-lg" />
      <div className="h-64 bg-muted rounded-2xl" />
    </div>;
  }

  return (
    <div className="p-3 md:p-4 lg:p-8 max-w-4xl mx-auto space-y-4 md:space-y-8 pb-32">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-primary/10 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Lock className="size-5 md:size-6 text-primary" />
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase">Cài đặt hệ thống</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground font-medium">Thiết lập bảo mật và đơn hàng cho @{tenantSlug}</p>
      </div>

      <Card className="border-none shadow-xl md:shadow-2xl shadow-black/5 rounded-[24px] md:rounded-[40px] overflow-hidden">
        <CardHeader className="bg-muted/30 p-4 md:p-8 pb-4 md:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base md:text-xl font-black uppercase tracking-tight">Giới hạn IP mạng LAN / Wi-Fi</CardTitle>
              <CardDescription className="text-xs md:text-sm">Ngăn chặn khách đặt món nếu họ không ở trong cửa hàng.</CardDescription>
            </div>
            <Switch
              checked={data.ip_restriction_enabled}
              onCheckedChange={(checked) => setData({ ...data, ip_restriction_enabled: checked })}
              className="scale-110 md:scale-125 data-[state=checked]:bg-emerald-500"
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8">
          {data.ip_restriction_enabled && (
            <Alert className="bg-emerald-50/50 border-emerald-100 text-emerald-800 rounded-3xl p-6">
              <Shield className="size-5 text-emerald-600" />
              <AlertTitle className="font-black text-emerald-900 mb-1">CHẾ ĐỘ BẢO MẬT ĐANG BẬT</AlertTitle>
              <AlertDescription className="text-xs font-medium">
                Chỉ những khách hàng sử dụng mạng Wi-Fi có địa chỉ IP dưới đây mới có thể truy cập trang Menu và gọi món.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">IP của bạn hiện tại</label>
              <div className="flex items-center gap-4 bg-muted/40 p-5 rounded-[32px] border border-black/5 transition-all hover:bg-muted/60">
                <Globe className="size-6 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-black tracking-tight font-mono">{data.currentIp}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70">Địa chỉ Wi-Fi hiện tại của quán</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                    <Zap className="size-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800 uppercase italic">Tự đồng bộ IP</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Luôn cập nhật khi admin đăng nhập</p>
                  </div>
                </div>
                <Switch
                  checked={data.ip_auto_sync}
                  onCheckedChange={(checked) => setData({ ...data, ip_auto_sync: checked })}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                Bật tính năng này để hệ thống tự cập nhật IP Wi-Fi mỗi khi mạng quán thay đổi (reset modem), giúp khách luôn vào được menu.
              </p>
            </div>
          </div>

          <Separator className="bg-black/[0.05]" />

          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                🏠 Thông tin Wi-Fi của quán
              </label>
              <p className="text-[10px] text-muted-foreground ml-1 italic">Thông tin này sẽ hiển thị cho khách để họ tự kết nối khi bị chặn truy cập.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Tên Wi-Fi (SSID)</label>
                <Input
                  placeholder="VD: Sanmyshi_Coffee"
                  value={data.wifi_name}
                  onChange={(e) => setData({ ...data, wifi_name: e.target.value })}
                  className="rounded-2xl h-12 bg-muted/40 border-none px-5 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 pl-1">Mật khẩu Wi-Fi</label>
                <Input
                  placeholder="VD: 88888888"
                  value={data.wifi_password}
                  onChange={(e) => setData({ ...data, wifi_password: e.target.value })}
                  className="rounded-2xl h-12 bg-muted/40 border-none px-5 font-bold"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-black/[0.05]" />

          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                <Clock size={14} /> Thời gian cho phép hủy đơn (giây)
              </label>
              <p className="text-[10px] text-muted-foreground ml-1 italic">Khoảng thời gian khách hàng có thể tự hủy món sau khi bấm đặt.</p>
            </div>

            <div className="flex items-center gap-4 max-w-xs transition-all focus-within:translate-x-1">
              <Input
                type="number"
                value={data.order_cancel_window || 120}
                onChange={(e) => setData({ ...data, order_cancel_window: parseInt(e.target.value) || 0 })}
                className="h-14 rounded-2xl bg-muted/40 border-none font-black text-xl text-center focus-visible:ring-primary/20 shadow-inner"
              />
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Giây</span>
            </div>
          </div>

          <Separator className="bg-black/[0.05]" />

          <div className="space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Danh sách IP được phép</label>
              <p className="text-[10px] text-muted-foreground ml-1 italic">Bạn có thể thêm nhiều IP (ví dụ: Wi-Fi của cơ sở 2, 3...)</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {data.allowed_ips.map(ip => (
                <Badge key={ip} className="bg-white border-black/5 text-slate-800 py-2.5 pl-4 pr-2 rounded-2xl flex items-center gap-2 shadow-sm animate-in zoom-in duration-300">
                  <span className="font-mono font-bold text-sm tracking-tight">{ip}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-xl hover:bg-red-50 hover:text-red-500"
                    onClick={() => removeIp(ip)}
                  >
                    <X size={14} />
                  </Button>
                </Badge>
              ))}
              {data.allowed_ips.length === 0 && (
                <div className="w-full py-8 text-center bg-muted/20 border-2 border-dashed border-black/5 rounded-[32px]">
                  <AlertCircle className="size-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Chưa có IP nào được cấp quyền</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Input
                placeholder="Nhập IP thủ công (vd: 1.254.x.x)"
                className="rounded-2xl h-12 border-none bg-muted/40 focus-visible:ring-primary/20 font-mono font-bold px-5"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addIp(newIp)}
              />
              <Button
                className="h-12 rounded-2xl px-8 bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/10"
                onClick={() => addIp(newIp)}
              >
                <Plus className="size-5 mr-2" /> THÊM
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Alert variant="destructive" className="bg-orange-50 border-orange-100 text-orange-800 rounded-3xl p-6">
              <Info className="size-5 text-orange-600" />
              <AlertTitle className="font-black text-orange-900 mb-1">LƯU Ý QUAN TRỌNG</AlertTitle>
              <AlertDescription className="text-[10px] font-medium leading-relaxed">
                Nếu Wi-Fi quán của bạn không sử dụng IP tĩnh (như gói cước gia đình/văn phòng thông thường), IP công cộng sẽ thay đổi sau khi mất điện hoặc reset modem.
                Hãy bật tính năng <span className="font-bold underline">Tự đồng bộ IP</span> để hệ thống luôn cập nhật giúp khách hàng không bị chặn.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-3 md:px-4 lg:px-8 pointer-events-none z-50">
        <Button
          className="w-full h-14 md:h-16 rounded-[20px] md:rounded-[28px] bg-primary hover:bg-primary/90 text-white font-black shadow-2xl shadow-primary/30 text-sm md:text-lg tracking-tight pointer-events-auto transition-transform active:scale-95"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <RefreshCw className="size-5 md:size-6 animate-spin" />
          ) : (
            <>
              <Save className="size-5 md:size-6 mr-2 md:mr-3" /> LƯU THAY ĐỔI CẤU HÌNH
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
