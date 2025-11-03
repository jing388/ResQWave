import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Alert, { AlertDescription } from '@/components/ui/alert-focal';
import { CheckCircle2Icon, Info } from 'lucide-react';
import type { DashboardAlertsProps } from '../types/alerts';

const DashboardAlerts = forwardRef(function DashboardAlerts({ editBoundaryOpen, canSave, savedTrigger, savedMessage, onViewLogs, showViewLogs = true }: DashboardAlertsProps, ref) {
	const [showEditAlert, setShowEditAlert] = useState(false);
	const editAlertTimer = useRef<number | null>(null);

	const [showValidAlert, setShowValidAlert] = useState(false);
	const validAlertTimer = useRef<number | null>(null);

	// message shown inside the valid alert; default kept for boundaries
	const [validAlertMessage, setValidAlertMessage] = useState<string>('Boundaries set are valid!');

	const [showSavedAlert, setShowSavedAlert] = useState(false);
	const savedAlertTimer = useRef<number | null>(null);

	// Handle transient edit alert when edit mode turns on
	useEffect(() => {
		if (editBoundaryOpen) {
			if (editAlertTimer.current) {
				window.clearTimeout(editAlertTimer.current);
			}
			setShowEditAlert(true);
			editAlertTimer.current = window.setTimeout(() => {
				setShowEditAlert(false);
				editAlertTimer.current = null;
			}, 3000);
		}

		return () => {
			if (editAlertTimer.current) {
				window.clearTimeout(editAlertTimer.current);
				editAlertTimer.current = null;
			}
		};
	}, [editBoundaryOpen]);

	// Show brief valid alert when canSave becomes true
	useEffect(() => {
		if (canSave) {
			if (validAlertTimer.current) {
				window.clearTimeout(validAlertTimer.current);
			}
			setShowValidAlert(true);
			validAlertTimer.current = window.setTimeout(() => {
				setShowValidAlert(false);
				validAlertTimer.current = null;
			}, 2500);
		}

		return () => {
			if (validAlertTimer.current) {
				window.clearTimeout(validAlertTimer.current);
				validAlertTimer.current = null;
			}
		};
	}, [canSave]);

	// function to programmatically show the valid alert with custom text
	const showValidAlertWithMessage = (msg?: string) => {
		if (validAlertTimer.current) {
			window.clearTimeout(validAlertTimer.current);
		}
		if (msg) setValidAlertMessage(msg);
		setShowValidAlert(true);
		validAlertTimer.current = window.setTimeout(() => {
			setShowValidAlert(false);
			validAlertTimer.current = null;
		}, 2500);
	};

	// Show saved alert when savedTrigger increments (only when non-null)
	useEffect(() => {
		if (savedTrigger == null) return;
		// ensure the valid alert is hidden when a save happens
		setShowValidAlert(false);
		if (savedAlertTimer.current) {
			window.clearTimeout(savedAlertTimer.current);
		}
		setShowSavedAlert(true);
		// Use a shorter duration for refresh-style toasts (no View Logs button)
		const savedDuration = showViewLogs ? 4500 : 1200; // ms
		savedAlertTimer.current = window.setTimeout(() => {
			setShowSavedAlert(false);
			savedAlertTimer.current = null;
		}, savedDuration);

		return () => {
			if (savedAlertTimer.current) {
				window.clearTimeout(savedAlertTimer.current);
				savedAlertTimer.current = null;
			}
		};
	}, [savedTrigger, showViewLogs]);

	// expose imperative API to parent: hideValidAlert(), hideEditAlert(), hideSavedAlert()
	useImperativeHandle(ref, () => ({
		hideValidAlert: () => setShowValidAlert(false),
		hideEditAlert: () => setShowEditAlert(false),
		hideSavedAlert: () => setShowSavedAlert(false),
		// show valid alert with optional custom message
		showValidAlert: (msg?: string) => showValidAlertWithMessage(msg),
	}), []);

	return (
		<>
			{/* Boundaries valid success alert (shown briefly when polygon is closed) */}
			<div style={{ position: 'absolute', left: '50%', bottom: 30, transform: `translateX(-50%) translateY(${showValidAlert ? '0' : '80px'})`, transition: 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 220ms linear', opacity: showValidAlert ? 1 : 0, pointerEvents: showValidAlert ? 'auto' : 'none', zIndex: 100000 }}>
				<div style={{ minWidth: 160, maxWidth: 320 }}>
					<Alert iconBoxVariant="success">
						<CheckCircle2Icon color="#22c55e" />
						<div>
							<AlertDescription><b>Note:</b> {validAlertMessage}</AlertDescription>
						</div>
					</Alert>
				</div>
			</div>

			{/* Transient bottom-centered alert that slides up when editing community markers */}
			<div style={{ position: 'absolute', left: '50%', bottom: 30, transform: `translateX(-50%) translateY(${showEditAlert ? '0' : '120px'})`, transition: 'transform 320ms cubic-bezier(.2,.9,.2,1)', zIndex: 60 }}>
				<div style={{ minWidth: 520, maxWidth: 570, background: "#000", borderRadius: 7 }}>
					<Alert iconBoxVariant="note">
						<Info color="#3B82F6" />
						<div>
							<AlertDescription>
								<b>Note:</b> Click on the map to mark the corners of your community boundary. The border will connect automatically.
							</AlertDescription>
						</div>
					</Alert>
				</div>
			</div>

			{/* Saved confirmation alert with View Logs button */}
			<div style={{ position: 'absolute', left: 30, bottom: 30, transform: `translateX(${showSavedAlert ? '0' : '-180px'})`, transition: 'transform 320ms cubic-bezier(.2,.9,.2,1), opacity 220ms linear', opacity: showSavedAlert ? 1 : 0, pointerEvents: showSavedAlert ? 'auto' : 'none', zIndex: 100001 }}>
				<div style={showViewLogs ? { minWidth: 230, maxWidth: 530 } : { minWidth: 190, maxWidth: 350 }}>
					<Alert iconBoxVariant="success">
						<CheckCircle2Icon color="#22c55e" />
						<div style={{ display: 'flex', alignItems: 'center', justifyContent: showViewLogs ? 'space-between' : 'flex-start', gap: 12 }}>
							<div style={showViewLogs ? { minWidth: 290 } : {}}>
								<AlertDescription>{savedMessage ?? 'Saved successfully!'}</AlertDescription>
							</div>
							{showViewLogs && (
								<div>
									<button onClick={() => onViewLogs?.()} style={{ background: '#3B82F6', fontSize: "13px", color: '#fff', padding: '8px 14px', borderRadius: 4, border: 'none', cursor: 'pointer' }}>View Logs</button>
								</div>
							)}
						</div>
					</Alert>
				</div>
			</div>
		</>
	);
});

export default DashboardAlerts;

