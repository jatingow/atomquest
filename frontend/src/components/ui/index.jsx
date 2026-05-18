export const Card = ({ children, className = '', hover = false, glow = null, ...props }) => (
    <div
        className={`card ${hover ? 'card-hover' : ''} ${glow ? `shadow-${glow}` : ''} ${className}`}
        {...props}
    >
        {children}
    </div>
)

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    className = '',
    ...props
}) => {
    const variantClass = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
    }[variant] || 'btn-primary'

    const sizeClass = {
        sm: 'px-3 py-1 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    }[size] || 'px-4 py-2 text-sm'

    return (
        <button className={`btn ${variantClass} ${sizeClass} ${className}`} {...props}>
            {icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    )
}

export const Badge = ({ children, variant = 'cyan', className = '' }) => {
    const variantClass = {
        cyan: 'badge-cyan',
        purple: 'badge-purple',
        green: 'badge-green',
        orange: 'badge-orange',
        red: 'badge-red',
    }[variant] || 'badge-cyan'

    return <span className={`badge ${variantClass} ${className}`}>{children}</span>
}

export const Label = ({ children, className = '' }) => (
    <label className={`label ${className}`}>{children}</label>
)

export const Input = ({ className = '', ...props }) => (
    <input className={`input ${className}`} {...props} />
)

export const SelectInput = ({ options, className = '', ...props }) => (
    <select className={`input ${className}`} {...props}>
        {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
                {opt.label}
            </option>
        ))}
    </select>
)

export const StatCard = ({ label, value, icon, color = 'cyan', className = '' }) => (
    <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-2">
            {icon && <span className="text-2xl">{icon}</span>}
        </div>
        <div className={`text-2xl font-bold font-mono text-${color}-400 mb-1`}>{value}</div>
        <div className="text-xs text-slate-400 font-medium">{label}</div>
    </Card>
)

export const Avatar = ({ initials, color = 'cyan', size = 'md' }) => {
    const sizeClass = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
    }[size] || 'w-10 h-10 text-sm'

    return (
        <div
            className={`${sizeClass} rounded-lg flex items-center justify-center font-bold flex-shrink-0 bg-${color}-900/20 border border-${color}-700/30 text-${color}-300`}
        >
            {initials}
        </div>
    )
}

export const ProgressBar = ({ value, max = 100, color = 'cyan' }) => {
    const percentage = (value / max) * 100
    return (
        <div className="progress-bar">
            <div
                className={`h-full bg-${color}-500 transition-all duration-300 rounded-full`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
            />
        </div>
    )
}

export const PageHeader = ({ label, title, description, action }) => (
    <div className="mb-8">
        {label && <div className="label mb-2">{label}</div>}
        <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 mb-1 -tracking-wide">{title}</h1>
                {description && <p className="text-sm text-slate-400">{description}</p>}
            </div>
            {action}
        </div>
    </div>
)

export const StatusBadge = ({ status }) => {
    const statusConfig = {
        draft: { variant: 'orange', label: 'Draft' },
        submitted: { variant: 'cyan', label: 'Submitted' },
        approved: { variant: 'green', label: 'Approved' },
        rework: { variant: 'red', label: 'Rework' },
        active: { variant: 'green', label: 'Active' },
        closed: { variant: 'slate', label: 'Closed' },
    }

    const config = statusConfig[status] || statusConfig.draft

    return <Badge variant={config.variant}>{config.label}</Badge>
}

export const EmptyState = ({ icon, title, description }) => (
    <div className="flex flex-col items-center justify-center py-12">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
        <p className="text-sm text-slate-400">{description}</p>
    </div>
)
