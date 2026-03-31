import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Quản lý Nhà hàng</h1>
          <p className="text-muted-foreground mt-2">
            Hệ thống quản lý menu, bàn, và đơn hàng
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Bắt đầu</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <a href="/auth/login">Đăng nhập</a>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <a href="/auth/signup">Đăng ký</a>
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📋 Quản lý Menu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Thêm, sửa, xóa các món ăn và danh mục
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🪑 Quản lý Bàn</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quản lý bàn, QR code, và trạng thái
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📦 Quản lý Đơn hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Theo dõi và quản lý các đơn hàng
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
