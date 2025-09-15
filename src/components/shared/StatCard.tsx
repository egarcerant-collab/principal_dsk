
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const StatCard = ({ title, value, icon: Icon, footer }: { title: string, value: string | number, icon: React.ElementType, footer?: string }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {footer && <p className="text-xs text-muted-foreground">{footer}</p>}
      </CardContent>
    </Card>
);

export default StatCard;
