"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { tenantsApi, type TenantSettings as SettingsData } from "@/lib/api/tenants";
import { Shield, Save, Plus, X, Globe, Lock, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";



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
      setData(result.payload);
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
      });
      alert("Cấu hình đã được lưu thành công!");
    } catch (error) {
      alert("Lỗi khi lưu cấu hình!");
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
    <div className="p-3 md:p-4 lg:p-8 max-w-4xl mx-auto space-y-4 md:space-y-8 pb-24 md:pb-20">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="bg-primary/10 p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Lock className="size-5 md:size-6 text-primary" />
          </div>
          <h1 className="text-xl md:text-3xl font-black tracking-tight uppercase">Cài đặt bảo mật</h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground font-medium">Thiết lập giới hạn truy cập cho @{tenantSlug}</p>
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

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">IP của bạn hiện tại</label>
            <div className="flex items-center gap-4 bg-muted/40 p-5 rounded-[32px] border border-black/5 transition-all hover:bg-muted/60">
              <Globe className="size-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-black tracking-tight font-mono">{data.currentIp}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-70">Đây là địa chỉ IP mạng bạn đang sử dụng</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl h-10 px-6 font-bold border-none bg-white shadow-sm hover:bg-primary hover:text-white transition-all active:scale-95"
                onClick={() => addIp(data.currentIp)}
                disabled={data.allowed_ips.includes(data.currentIp)}
              >
                + Thêm ngay
              </Button>
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
                Nếu Wi-Fi quán của bạn không sử dụng IP tĩnh, IP công cộng có thể thay đổi định kỳ hoặc sau khi mất điện.
                Hãy đảm bảo bạn cập nhật IP mới tại đây nếu khách hàng không thể vào được Menu.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-3 md:px-4 lg:px-8 pointer-events-none">
        <Button
          className="w-full h-14 md:h-16 rounded-[20px] md:rounded-[28px] bg-primary hover:bg-primary/90 text-white font-black shadow-2xl shadow-primary/30 text-sm md:text-lg tracking-tight pointer-events-auto transition-transform active:scale-95"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <div className="size-5 md:size-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
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
